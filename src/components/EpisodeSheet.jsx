import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Sheet } from './ui'
import StarRating from './StarRating'
import CharacterPicker from './CharacterPicker'
import RatingBadges from './RatingBadges'
import { EMOTIONS, PLATFORMS, DEVICES } from '../lib/constants'
import { getEpisodeCredits } from '../lib/tmdb'
import { imdbEpisodeRating } from '../lib/omdb'
import { markEpisode, unmarkEpisode, upsertEpisodeDetails } from '../lib/db'

const parseArr = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }
const today = () => new Date().toISOString().slice(0, 10)

export default function EpisodeSheet({ open, onClose, show, imdbId, season, episode, watched, detail, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const [isWatched, setWatched] = useState(watched)
  const [date, setDate] = useState(detail?.watched_date || today())
  const [rating, setRating] = useState(detail?.rating || null)
  const [emotions, setEmotions] = useState(parseArr(detail?.emotions))
  const [character, setCharacter] = useState(detail?.fav_character || '')
  const [platform, setPlatform] = useState(detail?.platform || '')
  const [device, setDevice] = useState(detail?.device || '')
  const [note, setNote] = useState(detail?.note || '')
  const [cast, setCast] = useState([])
  const [imdb, setImdb] = useState(detail?.imdb_rating ?? null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !episode) return
    setWatched(watched)
    setDate(detail?.watched_date || today())
    setRating(detail?.rating || null)
    setEmotions(parseArr(detail?.emotions))
    setCharacter(detail?.fav_character || '')
    setPlatform(detail?.platform || '')
    setDevice(detail?.device || '')
    setNote(detail?.note || '')
    setImdb(detail?.imdb_rating ?? null)
    // cast episodio (guest incluse) -> normalizzato su PERSONAGGIO
    getEpisodeCredits(show.id, season, episode.episode_number).then(cr => {
      const all = [...(cr.cast || []), ...(cr.guest_stars || [])]
      setCast(all.map(c => ({ character: c.character, actor: c.name, profile_path: c.profile_path })))
    }).catch(() => setCast([]))
    // voto IMDb episodio (best-effort, non bloccante)
    if (imdbId && (detail?.imdb_rating == null)) {
      imdbEpisodeRating(imdbId, season, episode.episode_number).then(r => { if (r != null) setImdb(r) })
    }
  }, [open, episode?.episode_number, season])

  if (!episode) return null

  const toggleEmotion = (e) => setEmotions(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])

  const save = async () => {
    setBusy(true)
    try {
      // stato visto
      if (isWatched && !watched) await markEpisode(user.id, show.id, season, episode.episode_number, date)
      if (!isWatched && watched) await unmarkEpisode(user.id, show.id, season, episode.episode_number)
      if (isWatched && watched && date !== detail?.watched_date) {
        await markEpisode(user.id, show.id, season, episode.episode_number, date) // aggiorna data
      }
      // dettagli
      await upsertEpisodeDetails({
        user_id: user.id, tmdb_show_id: show.id, season_number: season, episode_number: episode.episode_number,
        rating, emotions: JSON.stringify(emotions), fav_character: character || null,
        platform: platform || null, device: device || null, note: note || null,
        watched_date: isWatched ? date : null, imdb_rating: imdb,
      })
      toast.success('Episodio salvato.')
      onSaved?.()
      onClose()
    } catch (e) {
      toast.error(e.message) // messaggio VERO di Supabase
    }
    setBusy(false)
  }

  const runtime = episode.runtime || show.episode_run_time?.[0]

  return (
    <Sheet open={open} onClose={onClose} title={`S${season}·E${episode.episode_number}`}>
      <div style={{ marginBottom: 4, fontWeight: 700, fontSize: 16 }}>{episode.name}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <RatingBadges tmdb={episode.vote_average} imdb={imdb} size="sm" />
        {runtime ? <span className="muted" style={{ fontSize: 12 }}>~{runtime}min</span> : null}
      </div>

      <button className={'chip btn-block' + (isWatched ? ' on' : '')} style={{ justifyContent: 'center', padding: 12 }} onClick={() => setWatched(w => !w)}>
        {isWatched ? '✓ Visto' : 'Segna come visto'}
      </button>

      {isWatched && (
        <>
          <label className="lbl">Data di visione</label>
          <input className="field" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </>
      )}

      <label className="lbl">Il tuo voto</label>
      <StarRating value={rating} onChange={setRating} half size={32} />

      <label className="lbl">Emozioni</label>
      <div className="emo-grid">
        {EMOTIONS.map(({ e, label }) => (
          <button key={e} className={'emo' + (emotions.includes(e) ? ' on' : '')} onClick={() => toggleEmotion(e)}>
            <span className="emo-e">{e}</span><span className="emo-l">{label}</span>
          </button>
        ))}
      </div>

      <label className="lbl">Personaggio preferito (episodio)</label>
      <CharacterPicker cast={cast} value={character} onChange={setCharacter} />

      <label className="lbl">Piattaforma</label>
      <div className="chip-row" style={{ flexWrap: 'wrap' }}>
        {PLATFORMS.map(p => <button key={p} className={'chip' + (platform === p ? ' on' : '')} onClick={() => setPlatform(platform === p ? '' : p)}>{p}</button>)}
      </div>

      <label className="lbl">Dispositivo</label>
      <div className="chip-row">
        {DEVICES.map(d => <button key={d} className={'chip' + (device === d ? ' on' : '')} onClick={() => setDevice(device === d ? '' : d)}>{d}</button>)}
      </div>

      <label className="lbl">Nota</label>
      <textarea className="field" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Pensieri sull'episodio…" />

      <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy} onClick={save}>
        {busy ? 'Salvo…' : 'Salva episodio'}
      </button>

      <style>{`
        .emo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .emo { display: flex; align-items: center; gap: 6px; padding: 8px; background: var(--surface0); border: 1px solid transparent; font-size: 12px; }
        .emo.on { border-color: var(--mauve); background: rgba(203,166,247,.14); }
        .emo-e { font-size: 16px; }
        .emo-l { color: var(--subtext); }
        .emo.on .emo-l { color: var(--mauve); }
      `}</style>
    </Sheet>
  )
}
