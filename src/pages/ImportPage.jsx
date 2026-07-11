import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { tmdb, buildShowPayload } from '../lib/tmdb'
import { tvdbKeyMissing, tvdbCharacterName } from '../lib/tvdb'
import {
  IMPORT_FILES, EMOTION_DEFAULTS, parseTvtime, assemblePlan, planSummary,
} from '../lib/importer'
import { EMOTIONS } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import SectionHead from '../components/SectionHead'
import ProgressBar from '../components/ProgressBar'
import ConfirmButton from '../components/ConfirmButton'

const CONFLICT_EP = 'user_id,tmdb_show_id,season_number,episode_number'
const PLATFORM_MAP = { 3: { platform: 'Pirateria', device: 'PC' } } // deciso con l'utente

// pool di richieste con concorrenza limitata
async function pool(items, size, fn, onEach) {
  const queue = [...items]
  let done = 0
  async function worker() {
    while (queue.length) {
      const item = queue.shift()
      await fn(item)
      done += 1
      onEach?.(done)
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) || 1 }, worker))
}

function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export default function ImportPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [phase, setPhase] = useState('pick') // pick|reading|matching|report|writing|characters|done
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState({ label: '', done: 0, total: 0 })
  const [summary, setSummary] = useState(null)
  const [emotionMap, setEmotionMap] = useState({ ...EMOTION_DEFAULTS })
  const [finalStats, setFinalStats] = useState(null)
  const data = useRef({ parsed: null, matches: null, plan: null, logs: [] })

  const log = (msg) => { data.current.logs.push(msg) }

  function fail(err) {
    console.error(err)
    setError(err.message || String(err))
    setPhase('pick')
  }

  // ---------- 1) lettura zip + parsing ----------
  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setPhase('reading')
    try {
      const [{ default: JSZip }, { default: Papa }] = await Promise.all([
        import('jszip'), import('papaparse'),
      ])
      const zip = await JSZip.loadAsync(file)
      // si aprono SOLO i file whitelisted; token/credenziali mai letti
      const texts = {}
      for (const [k, fname] of Object.entries(IMPORT_FILES)) {
        const entry = Object.values(zip.files).find(
          (f) => !f.dir && f.name.split('/').pop() === fname
        )
        texts[k] = entry ? await entry.async('string') : ''
      }
      if (!texts.tracking) {
        throw new Error(`File ${IMPORT_FILES.tracking} non trovato nello zip: è l'export GDPR giusto?`)
      }
      for (const [k, fname] of Object.entries(IMPORT_FILES)) {
        if (!texts[k]) log(`File assente (saltato): ${fname}`)
      }
      const parsed = parseTvtime(texts, Papa)
      data.current.parsed = parsed
      parsed.log.forEach(log)
      await matchAll(parsed)
    } catch (err) {
      fail(err)
    }
  }

  // ---------- 2) matching TMDB via TheTVDB id ----------
  async function matchAll(parsed) {
    setPhase('matching')
    const sids = [...parsed.seriesFlags.keys()]
    const matches = new Map()
    setProgress({ label: 'Abbinamento serie su TMDB', done: 0, total: sids.length })
    await pool(sids, 4, async (sid) => {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const found = await tmdb.findByTvdb(sid)
          const hit = found.tv_results?.[0]
          if (!hit) {
            matches.set(sid, null)
            log(`Nessun match TMDB: ${parsed.seriesFlags.get(sid)?.name ?? sid} (tvdb:${sid})`)
            return
          }
          const full = await tmdb.show(hit.id)
          matches.set(sid, { tmdb: full })
          return
        } catch (err) {
          if (attempt === 2) {
            matches.set(sid, null)
            log(`Errore match tvdb:${sid} (${parsed.seriesFlags.get(sid)?.name ?? '?'}): ${err.message}`)
          } else {
            await new Promise((r) => setTimeout(r, 1200))
          }
        }
      }
    }, (done) => setProgress((p) => ({ ...p, done })))
    data.current.matches = matches
    rebuildPlan()
    setPhase('report')
  }

  function rebuildPlan(map = emotionMap) {
    const { parsed, matches } = data.current
    const plan = assemblePlan(parsed, matches, map, PLATFORM_MAP)
    data.current.plan = plan
    setSummary(planSummary(parsed, plan))
  }

  function setEmotion(suffix, value) {
    const next = { ...emotionMap }
    if (value) next[suffix] = value
    else delete next[suffix]
    setEmotionMap(next)
    rebuildPlan(next)
  }

  function downloadLog() {
    const { plan, logs } = data.current
    const lines = [
      `MyTrackList — log import TVTime — ${new Date().toISOString()}`,
      '',
      '== Serie senza match TMDB ==',
      ...(plan?.unmatchedSeries ?? []).map((u) => `tvdb:${u.sid} — ${u.name} (${u.episodes} episodi)`),
      '',
      '== Note ==',
      ...logs,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'mytracklist-import-log.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // ---------- 3) scrittura (upsert idempotenti, a lotti) ----------
  async function runImport() {
    setError(null)
    setPhase('writing')
    const { plan } = data.current
    try {
      // serie
      const showRows = plan.shows.map((s) => buildShowPayload(s.tmdbShow, user.id, {
        status: s.status,
        rating: s.rating,
        main_platform: s.main_platform,
        main_device: s.main_device,
      }))
      setProgress({ label: 'Scrittura serie', done: 0, total: showRows.length })
      for (const [i, part] of chunk(showRows, 100).entries()) {
        const { error: err } = await supabase.from('user_shows')
          .upsert(part, { onConflict: 'user_id,tmdb_id' })
        if (err) throw new Error(`user_shows (lotto ${i + 1}): ${err.message}`)
        setProgress((p) => ({ ...p, done: Math.min(p.total, (i + 1) * 100) }))
      }

      // episodi
      const epRows = plan.episodes.map((r) => ({ ...r, user_id: user.id }))
      setProgress({ label: 'Scrittura episodi', done: 0, total: epRows.length })
      for (const [i, part] of chunk(epRows, 400).entries()) {
        const { error: err } = await supabase.from('user_episodes')
          .upsert(part, { onConflict: CONFLICT_EP })
        if (err) throw new Error(`user_episodes (lotto ${i + 1}): ${err.message}`)
        setProgress((p) => ({ ...p, done: Math.min(p.total, (i + 1) * 400) }))
      }

      // dettagli episodio
      const detRows = plan.details.map((r) => ({ ...r, user_id: user.id }))
      setProgress({ label: 'Scrittura dettagli (voti, emozioni, date)', done: 0, total: detRows.length })
      for (const [i, part] of chunk(detRows, 400).entries()) {
        const { error: err } = await supabase.from('episode_details')
          .upsert(part, { onConflict: CONFLICT_EP })
        if (err) throw new Error(`episode_details (lotto ${i + 1}): ${err.message}`)
        setProgress((p) => ({ ...p, done: Math.min(p.total, (i + 1) * 400) }))
      }

      // preferite
      if (plan.favorites.length) {
        const favRows = plan.favorites.map((r) => ({ ...r, user_id: user.id }))
        const { error: err } = await supabase.from('user_favorites')
          .upsert(favRows, { onConflict: 'user_id,tmdb_id' })
        if (err) throw new Error(`user_favorites: ${err.message}`)
      }

      await runCharacters()
    } catch (err) {
      setError(`${err.message} — puoi rilanciare l'import: le scritture sono idempotenti, niente duplicati.`)
    }
  }

  // ---------- 4) personaggi via TheTVDB (facoltativo) ----------
  async function runCharacters() {
    const { plan, parsed } = data.current
    if (!plan.charPatches.length || tvdbKeyMissing) {
      if (plan.charPatches.length && tvdbKeyMissing) {
        log(`Personaggi saltati: manca VITE_TVDB_API_KEY (${plan.charPatches.length} voti)`)
      }
      finish()
      return
    }
    setPhase('characters')
    const ids = [...parsed.charIds]
    const names = new Map()
    setProgress({ label: 'Nomi personaggi (TheTVDB)', done: 0, total: ids.length })
    let failures = 0
    await pool(ids, 3, async (id) => {
      try {
        const name = await tvdbCharacterName(id)
        if (name) names.set(id, name)
        else log(`Personaggio ${id}: nome assente`)
      } catch (err) {
        failures += 1
        if (failures <= 5) log(`Personaggio ${id}: ${err.message}`)
      }
    }, (done) => setProgress((p) => ({ ...p, done })))
    if (failures > 5) log(`…e altri ${failures - 5} personaggi non risolti`)

    const patchRows = plan.charPatches
      .filter((c) => names.has(c.characterId))
      .map((c) => ({
        user_id: user.id,
        tmdb_show_id: c.tmdb_show_id,
        season_number: c.season_number,
        episode_number: c.episode_number,
        fav_character: names.get(c.characterId),
      }))
    setProgress({ label: 'Scrittura personaggi', done: 0, total: patchRows.length })
    for (const [i, part] of chunk(patchRows, 400).entries()) {
      const { error: err } = await supabase.from('episode_details')
        .upsert(part, { onConflict: CONFLICT_EP })
      if (err) {
        setError(`personaggi (lotto ${i + 1}): ${err.message} — rilanciabile senza duplicati.`)
        return
      }
      setProgress((p) => ({ ...p, done: Math.min(p.total, (i + 1) * 400) }))
    }

    // personaggio più votato → campo "personaggio preferito" della serie
    for (const t of plan.showCharTop) {
      const name = names.get(t.characterId)
      if (!name) continue
      const { error: err } = await supabase.from('user_shows')
        .update({ fav_character: name })
        .match({ user_id: user.id, tmdb_id: t.tmdb_id })
      if (err) { log(`Personaggio serie tmdb:${t.tmdb_id}: ${err.message}`); break }
    }
    finish(names.size)
  }

  function finish(charNames = 0) {
    setFinalStats({ ...summary, charNames })
    setPhase('done')
    toast.success('Import completato')
  }

  const emotionRows = data.current.parsed
    ? [...data.current.parsed.emotionStats.entries()].sort((a, b) => b[1].count - a[1].count)
    : []

  return (
    <>
      <h1 className="page-title">IMPORT TVTIME</h1>

      {error && (
        <div className="banner banner-error mt-16">
          <span className="banner-tag">ERR</span>
          <span className="banner-msg mono">{error}</span>
        </div>
      )}

      {phase === 'pick' && (
        <>
          <div className="card card-accent mt-16">
            <p className="overline">// export gdpr</p>
            <p className="text-sm text-sub mt-8">
              Carica lo zip dell'export TVTime così com'è. Vengono letti solo i file
              di tracking, voti, emozioni, piattaforme, personaggi e preferite —
              credenziali, token e dati sensibili non vengono mai aperti.
            </p>
            <p className="text-sm text-sub mt-8">
              Prima della scrittura vedrai un'anteprima completa (dry-run) con la
              mappatura delle emozioni modificabile. Le scritture sono idempotenti:
              in caso di interruzione puoi rilanciare senza creare duplicati.
            </p>
          </div>
          <label className="btn btn-primary btn-block mt-16" style={{ cursor: 'pointer' }}>
            Scegli il file .zip
            <input type="file" accept=".zip" onChange={onFile} style={{ display: 'none' }} />
          </label>
        </>
      )}

      {(phase === 'reading' || phase === 'matching' || phase === 'writing' || phase === 'characters') && (
        <div className="card card-accent mt-16">
          <p className="overline">
            {phase === 'reading' ? '// lettura e parsing…' : `// ${progress.label}`}
          </p>
          {progress.total > 0 && phase !== 'reading' && (
            <>
              <div className="mt-8"><ProgressBar value={progress.done} max={progress.total} /></div>
              <p className="mono text-sm text-sub mt-8">{progress.done}/{progress.total}</p>
            </>
          )}
          <p className="text-sm text-sub mt-8">Non chiudere questa pagina.</p>
        </div>
      )}

      {phase === 'report' && summary && (
        <>
          <SectionHead title="ANTEPRIMA" tag="dry-run" />
          <div className="stat-tiles">
            <div className="stat-tile"><div className="stat-num">{summary.seriesMatched}</div><div className="stat-lab">serie abbinate</div></div>
            <div className="stat-tile"><div className="stat-num">{summary.seriesUnmatched}</div><div className="stat-lab">senza match</div></div>
            <div className="stat-tile"><div className="stat-num">{summary.episodes}</div><div className="stat-lab">episodi</div></div>
            <div className="stat-tile"><div className="stat-num">{summary.totalWatches}</div><div className="stat-lab">visioni totali</div></div>
            <div className="stat-tile"><div className="stat-num">{summary.rewatchExtra}</div><div className="stat-lab">rivisioni</div></div>
            <div className="stat-tile"><div className="stat-num">{summary.ratings}</div><div className="stat-lab">voti episodio</div></div>
            <div className="stat-tile"><div className="stat-num">{summary.emotions}</div><div className="stat-lab">con emozioni</div></div>
            <div className="stat-tile"><div className="stat-num">{summary.platforms}</div><div className="stat-lab">con piattaforma</div></div>
            <div className="stat-tile"><div className="stat-num">{summary.favorites}</div><div className="stat-lab">preferite</div></div>
            <div className="stat-tile"><div className="stat-num">{summary.characters}</div><div className="stat-lab">voti personaggio</div></div>
          </div>

          <SectionHead title="STATI ASSEGNATI" />
          <p className="text-sm text-sub">
            {Object.entries(summary.statuses).map(([s, n]) => `${s}: ${n}`).join(' · ')}
          </p>
          <p className="hint mt-8">
            Regola: tutte viste → completata; archiviata su TVTime → abbandonata;
            episodi visti → in corso; solo seguita → da vedere.
          </p>

          {summary.seriesUnmatched > 0 && (
            <>
              <SectionHead title="SENZA MATCH" tag={`${summary.seriesUnmatched}`} />
              <div className="stack-8">
                {data.current.plan.unmatchedSeries.slice(0, 10).map((u) => (
                  <p key={u.sid} className="text-sm text-sub mono">
                    {u.name} — {u.episodes} ep (tvdb:{u.sid})
                  </p>
                ))}
                {summary.seriesUnmatched > 10 && (
                  <p className="hint">…tutte nel log scaricabile.</p>
                )}
              </div>
            </>
          )}

          <SectionHead title="MAPPATURA EMOZIONI" tag="modificabile" />
          <p className="text-sm text-sub" style={{ marginBottom: 12 }}>
            TVTime esporta solo id interni, senza etichette. Questa è la mia proposta:
            controlla gli esempi (sono tuoi voti reali) e correggi dove serve.
            "— scarta" esclude quell'id dall'import.
          </p>
          <div className="stack-8">
            {emotionRows.map(([suffix, st]) => (
              <div key={suffix} className="card" style={{ padding: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className="chip chip-mauve">id {suffix}</span>
                  <span className="mono text-sm text-sub">×{st.count}</span>
                  <select
                    className="input"
                    style={{ flex: 1, padding: 8 }}
                    value={emotionMap[suffix] ?? ''}
                    onChange={(e) => setEmotion(suffix, e.target.value)}
                  >
                    <option value="">— scarta</option>
                    {EMOTIONS.map((em) => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
                <p className="hint mt-8">{st.examples.join(' · ')}</p>
              </div>
            ))}
          </div>

          <div className="detail-actions mt-24">
            <button type="button" className="btn btn-sm btn-ghost" onClick={downloadLog}>
              Scarica log
            </button>
            <ConfirmButton
              label={`Importa ${summary.episodes} episodi`}
              confirmLabel="Conferma import"
              className="btn btn-primary"
              armedClassName="btn btn-danger"
              onConfirm={runImport}
            />
          </div>
          {tvdbKeyMissing && summary.characters > 0 && (
            <p className="hint mt-8">
              Nota: VITE_TVDB_API_KEY assente → i {summary.characters} voti personaggio
              verranno saltati (tutto il resto viene importato).
            </p>
          )}
        </>
      )}

      {phase === 'done' && finalStats && (
        <>
          <div className="card card-accent mt-16">
            <p className="overline">// completato</p>
            <h2 className="sheet-title" style={{ marginTop: 6 }}>Import riuscito</h2>
            <p className="text-sm text-sub mt-8">
              {finalStats.seriesMatched} serie · {finalStats.episodes} episodi ·{' '}
              {finalStats.totalWatches} visioni · {finalStats.ratings} voti ·{' '}
              {finalStats.emotions} con emozioni
              {finalStats.charNames > 0 && <> · {finalStats.charNames} personaggi risolti</>}
            </p>
          </div>
          <div className="detail-actions mt-16">
            <Link to="/libreria" className="btn btn-primary" style={{ flex: 1 }}>Apri la Libreria</Link>
            <button type="button" className="btn btn-sm btn-ghost" onClick={downloadLog}>Scarica log</button>
          </div>
          <p className="hint mt-8">
            Confronto utile: TVTime dichiarava ~15.032 ore totali (senza rivisioni).
            Controlla la tab Statistiche del profilo.
          </p>
        </>
      )}
    </>
  )
}
