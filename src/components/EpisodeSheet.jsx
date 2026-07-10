import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import StarRating from './StarRating'
import CharacterPicker from './CharacterPicker'
import { tmdb } from '../lib/tmdb'
import { omdbRating } from '../lib/external'
import { EMOTIONS, PLATFORMS, DEVICES } from '../lib/constants'
import { todayISO, parseJSONArray } from '../lib/format'
import { useToast } from '../context/ToastContext'

// ep: { season_number, episode_number, name, runtime, vote_average }
// watchedRow: riga user_episodes o null · details: riga episode_details o null
export default function EpisodeSheet({
  open, onClose, showId, ep, watchedRow, details,
  onMark, onUnmark, onSetWatchCount, onSaveDetails,
}) {
  const toast = useToast()
  const [rating, setRating] = useState(null)
  const [emotions, setEmotions] = useState([])
  const [favChar, setFavChar] = useState('')
  const [platform, setPlatform] = useState('')
  const [device, setDevice] = useState('')
  const [note, setNote] = useState('')
  const [watchedDate, setWatchedDate] = useState('')
  const [imdbEp, setImdbEp] = useState(null)
  const [cast, setCast] = useState([])
  const [saving, setSaving] = useState(false)

  const watched = Boolean(watchedRow)
  const count = watchedRow?.watch_count ?? 0

  useEffect(() => {
    if (!open || !ep) return
    setRating(details?.rating ?? null)
    setEmotions(parseJSONArray(details?.emotions))
    setFavChar(details?.fav_character ?? '')
    setPlatform(details?.platform ?? '')
    setDevice(details?.device ?? '')
    setNote(details?.note ?? '')
    setWatchedDate(details?.watched_date ?? (watchedRow ? todayISO() : ''))
    setImdbEp(details?.rating_imdb ?? null)
    setCast([])

    // Cast episodio (guest star incluse) → nomi PERSONAGGI
    tmdb.episodeCredits(showId, ep.season_number, ep.episode_number)
      .then((c) => {
        const all = [...(c.cast || []), ...(c.guest_stars || [])]
        const seen = new Set()
        const people = []
        for (const p of all) {
          const character = (p.character || '').trim()
          if (!character || seen.has(character)) continue
          seen.add(character)
          people.push({ key: `${p.id}-${character}`, character, profile_path: p.profile_path })
        }
        setCast(people.slice(0, 24))
      })
      .catch(() => setCast([]))

    // Voto IMDb episodio (se non già in cache) — fallimento silenzioso
    if (details?.rating_imdb == null) {
      tmdb.episodeExternalIds(showId, ep.season_number, ep.episode_number)
        .then((x) => omdbRating(x.imdb_id))
        .then((r) => { if (r != null) setImdbEp(r) })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ep?.season_number, ep?.episode_number])

  if (!ep) return null

  function toggleEmotion(e) {
    setEmotions((cur) => cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e])
  }

  async function save() {
    setSaving(true)
    const ok = await onSaveDetails(ep, {
      rating,
      emotions: emotions.length ? JSON.stringify(emotions) : null,
      fav_character: favChar || null,
      platform: platform || null,
      device: device || null,
      note: note || null,
      watched_date: watchedDate || null,
      rating_imdb: imdbEp,
    })
    setSaving(false)
    if (ok) {
      toast.success('Episodio salvato')
      onClose()
    }
  }

  const metaBits = [
    ep.runtime ? `${ep.runtime}min` : null,
    ep.vote_average ? `TMDB ${ep.vote_average.toFixed(1)}` : null,
    imdbEp != null ? `IMDb ${imdbEp}` : null,
  ].filter(Boolean)

  return (
    <Sheet open={open} onClose={onClose} title={`S${ep.season_number} · E${ep.episode_number}`}>
      <h2 className="sheet-title">{ep.name || `Episodio ${ep.episode_number}`}</h2>
      {metaBits.length > 0 && <p className="overline" style={{ marginBottom: 14 }}>{metaBits.join(' · ')}</p>}

      <div className="sheet-row">
        <button
          type="button"
          className={watched ? 'btn' : 'btn btn-primary'}
          onClick={() => (watched ? onUnmark(ep) : onMark(ep))}
        >
          {watched ? 'Segna non visto' : 'Segna visto'}
        </button>
        {watched && (
          <div className="counter">
            <button type="button" className="btn btn-sm" disabled={count <= 1}
              onClick={() => onSetWatchCount(ep, count - 1)}>−</button>
            <span className="mono">×{count}</span>
            <button type="button" className="btn btn-sm"
              onClick={() => onSetWatchCount(ep, count + 1)}>+</button>
          </div>
        )}
      </div>
      {watched && <p className="hint" style={{ marginTop: 4 }}>Volte visto: usa +/− per i rewatch.</p>}

      {watched && (
        <div className="field mt-16">
          <label className="label">Data visione</label>
          <input className="input" type="date" value={watchedDate}
            onChange={(e) => setWatchedDate(e.target.value)} />
        </div>
      )}

      <div className="field mt-16">
        <label className="label">Voto (mezze stelle · 1–10)</label>
        <StarRating value={rating} onChange={setRating} halves size={30} />
      </div>

      <div className="field">
        <label className="label">Emozioni</label>
        <div className="chips">
          {EMOTIONS.map((e) => (
            <button key={e} type="button"
              className={`chip-btn${emotions.includes(e) ? ' on' : ''}`}
              onClick={() => toggleEmotion(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">Personaggio preferito</label>
        <CharacterPicker
          people={cast}
          value={favChar}
          onChange={setFavChar}
          freeValue={favChar}
          onFreeChange={setFavChar}
        />
      </div>

      <div className="field">
        <label className="label">Piattaforma</label>
        <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">—</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="field">
        <label className="label">Dispositivo</label>
        <div className="chips">
          {DEVICES.map((d) => (
            <button key={d} type="button"
              className={`chip-btn${device === d ? ' on' : ''}`}
              onClick={() => setDevice(device === d ? '' : d)}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">Nota</label>
        <textarea className="input" rows={3} value={note}
          onChange={(e) => setNote(e.target.value)} />
      </div>

      <button type="button" className="btn btn-primary btn-block" disabled={saving} onClick={save}>
        {saving ? 'Attendi…' : 'Salva'}
      </button>
    </Sheet>
  )
}
