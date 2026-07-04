import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import JSZip from 'jszip'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { searchTv, getShow, avgRuntime, yearOf, genreNames } from '../lib/tmdb'
import { upsertShow, markEpisode } from '../lib/db'

const delay = (ms) => new Promise(r => setTimeout(r, ms))

// Individua la colonna più probabile per un ruolo, tra le intestazioni disponibili.
function guessColumn(headers, patterns) {
  for (const p of patterns) {
    const hit = headers.find(h => p.test(h))
    if (hit) return hit
  }
  return ''
}

export default function ImportTVTime() {
  const { user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const fileRef = useRef(null)

  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [map, setMap] = useState({ series: '', season: '', episode: '', date: '' })
  const [fileName, setFileName] = useState('')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [log, setLog] = useState([])

  const pushLog = (msg, type = 'info') => setLog(l => [{ msg, type, id: Math.random() }, ...l].slice(0, 200))

  const handleFile = async (file) => {
    if (!file) return
    setFileName(file.name)
    setLog([]); setRows([]); setHeaders([])
    try {
      let text = ''
      if (file.name.toLowerCase().endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file)
        // cerca il CSV di tracking serie/episodi nell'export GDPR
        const names = Object.keys(zip.files)
        const target = names.find(n => /tracking.*v2.*\.csv$/i.test(n))
          || names.find(n => /tracking.*\.csv$/i.test(n))
          || names.find(n => n.toLowerCase().endsWith('.csv'))
        if (!target) { toast.error('Nessun CSV trovato nello ZIP.'); return }
        pushLog(`CSV trovato nello ZIP: ${target}`)
        text = await zip.files[target].async('string')
      } else {
        text = await file.text()
      }
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      const data = parsed.data || []
      if (!data.length) { toast.error('Il file non contiene righe leggibili.'); return }
      const hdrs = parsed.meta?.fields || Object.keys(data[0])
      setRows(data); setHeaders(hdrs)
      // auto-guess mappatura (adattabile a mano quando arriva il file reale)
      setMap({
        series: guessColumn(hdrs, [/series.*name/i, /show.*name/i, /^title$/i, /^name$/i, /series/i]),
        season: guessColumn(hdrs, [/season.*number/i, /^season$/i, /season/i]),
        episode: guessColumn(hdrs, [/episode.*number/i, /^episode$/i, /episode/i, /number/i]),
        date: guessColumn(hdrs, [/watched.*at/i, /last.*watched/i, /watched/i, /created.*at/i, /date/i, /timestamp/i]),
      })
      toast.success(`${data.length} righe caricate. Controlla la mappatura colonne.`)
    } catch (e) {
      toast.error('Errore lettura file: ' + e.message)
    }
  }

  const onDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }

  const runImport = async () => {
    if (!map.series) return toast.error('Seleziona almeno la colonna del titolo serie.')
    setRunning(true); setLog([])

    // raggruppa per serie
    const groups = {}
    for (const r of rows) {
      const name = (r[map.series] || '').trim()
      if (!name) continue
      const s = parseInt(r[map.season], 10)
      const e = parseInt(r[map.episode], 10)
      const rawDate = map.date ? r[map.date] : null
      const date = rawDate ? String(rawDate).slice(0, 10) : null
      ;(groups[name] ||= []).push({ s, e, date })
    }
    const names = Object.keys(groups)
    setProgress({ done: 0, total: names.length })

    let ok = 0, skip = 0, fail = 0
    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      try {
        const results = await searchTv(name)
        if (!results.length) { pushLog(`Non trovata su TMDB: ${name}`, 'error'); skip++; setProgress({ done: i + 1, total: names.length }); await delay(300); continue }
        const match = results[0]
        // dati completi (runtime, generi, ecc.)
        const full = await getShow(match.id)
        const eps = groups[name].filter(x => Number.isFinite(x.s) && Number.isFinite(x.e))
        const watchedCount = eps.length
        const status = full.number_of_episodes && watchedCount >= full.number_of_episodes ? 'completata' : 'in_corso'
        const isAnim = (full.genres || []).some(g => g.id === 16)
        const type = isAnim ? (full.original_language === 'ja' ? 'anime' : 'cartone') : 'serie'

        await upsertShow({
          user_id: user.id, tmdb_id: match.id, status, show_type: type,
          title: full.name, original_title: full.original_name,
          poster_path: full.poster_path, backdrop_path: full.backdrop_path,
          first_air_year: yearOf(full), total_episodes: full.number_of_episodes,
          episode_runtime: avgRuntime(full), genres: JSON.stringify(genreNames(full)),
        })
        // marca episodi visti
        for (const ep of eps) {
          await markEpisode(user.id, match.id, ep.s, ep.e, ep.date)
        }
        pushLog(`✓ ${name} → ${full.name} (${eps.length} ep, ${status})`, 'success')
        ok++
      } catch (err) {
        pushLog(`Errore su ${name}: ${err.message}`, 'error'); fail++
      }
      setProgress({ done: i + 1, total: names.length })
      await delay(300) // rispetta TMDB
    }
    setRunning(false)
    toast.success(`Import finito: ${ok} importate, ${skip} non trovate, ${fail} errori.`)
  }

  const pct = progress.total ? Math.round(progress.done / progress.total * 100) : 0

  return (
    <div className="page page-pad-top">
      <button className="chip" onClick={() => nav('/profilo')} style={{ marginBottom: 12 }}>‹ Profilo</button>
      <h1 className="section-title" style={{ fontSize: 30 }}>Importa da TVTime</h1>

      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <p className="subtext" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Carica l'export GDPR di TVTime (lo ZIP o il file <span className="muted">tracking-prod-records-v2.csv</span>).
          Vengono importati <b>serie, episodi visti, date e stato</b>. Non sono importabili emozioni, personaggi preferiti e reazioni:
          TVTime non li include nell'export, quindi nessuno strumento può recuperarli.
        </p>
      </div>

      <div className="dropzone" onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".csv,.zip" hidden onChange={e => handleFile(e.target.files?.[0])} />
        <div className="dz-icon">⬇</div>
        <div style={{ fontWeight: 600 }}>{fileName || 'Trascina qui il file, o tocca per scegliere'}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>.zip oppure .csv</div>
      </div>

      {headers.length > 0 && (
        <>
          <h2 className="section-title" style={{ fontSize: 20, marginTop: 18 }}>Mappatura colonne</h2>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Ho provato a indovinare. Correggi se serve.</p>
          {[
            ['series', 'Titolo serie *'], ['season', 'Stagione'], ['episode', 'Episodio'], ['date', 'Data visione'],
          ].map(([k, label]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <label className="lbl" style={{ margin: '0 0 4px' }}>{label}</label>
              <select className="field" value={map[k]} onChange={e => setMap({ ...map, [k]: e.target.value })}>
                <option value="">— nessuna —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}

          <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={running} onClick={runImport}>
            {running ? `Importo… ${pct}%` : `Importa ${rows.length} righe`}
          </button>

          {running && <div className="prog" style={{ height: 8, marginTop: 12 }}><i style={{ width: pct + '%' }} /></div>}
        </>
      )}

      {log.length > 0 && (
        <>
          <h2 className="section-title" style={{ fontSize: 20, marginTop: 18 }}>Log</h2>
          <div className="import-log">
            {log.map(l => (
              <div key={l.id} className={'log-line ' + l.type}>{l.msg}</div>
            ))}
          </div>
        </>
      )}

      <style>{`
        .dropzone { border: 2px dashed var(--surface2); padding: 30px 16px; text-align: center; cursor: pointer; background: var(--mantle); transition: border-color .15s; }
        .dropzone:active { border-color: var(--mauve); }
        .dz-icon { font-size: 30px; color: var(--mauve); margin-bottom: 8px; }
        .import-log { background: var(--mantle); border: 1px solid var(--surface1); max-height: 300px; overflow-y: auto; padding: 8px; }
        .log-line { font-size: 12px; padding: 4px 6px; border-bottom: 1px solid var(--surface0); font-family: ui-monospace, monospace; word-break: break-word; }
        .log-line.success { color: var(--green); }
        .log-line.error { color: var(--red); }
        .log-line.info { color: var(--subtext); }
      `}</style>
    </div>
  )
}
