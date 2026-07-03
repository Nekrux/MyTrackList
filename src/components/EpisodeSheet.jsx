import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { EMOTIONS, PLATFORMS, DEVICES, getEpisodeCredits } from '../lib/tmdb'
import StarRating from './StarRating'
import CastPicker from './CastPicker'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function EpisodeSheet({ tmdbShowId, seasonNumber, episode, watched, details, onClose, onSaved }) {
  const { user } = useAuth()
  const [isWatched, setIsWatched] = useState(!!watched)
  const [watchedDate, setWatchedDate] = useState(details?.watched_date || todayISO())
  const [rating, setRating] = useState(details?.rating || 0)
  const [emotions, setEmotions] = useState(details?.emotions ? JSON.parse(details.emotions) : [])
  const [favCharacter, setFavCharacter] = useState(details?.fav_character || '')
  const [platform, setPlatform] = useState(details?.platform || '')
  const [device, setDevice] = useState(details?.device || '')
  const [watchCount, setWatchCount] = useState(details?.watch_count || (watched ? 1 : 0))
  const [note, setNote] = useState(details?.note || '')
  const [cast, setCast] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getEpisodeCredits(tmdbShowId, seasonNumber, episode.episode_number)
      .then(data => {
        const combined = [...(data.cast || []), ...(data.guest_stars || [])]
        const unique = Array.from(new Map(combined.map(c => [c.name, c])).values())
        setCast(unique)
      })
      .catch(() => setCast([]))
  }, [tmdbShowId, seasonNumber, episode.episode_number])

  function toggleEmotion(id) {
    setEmotions(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  function toggleWatchedSwitch() {
    const next = !isWatched
    setIsWatched(next)
    if (next && !watchCount) setWatchCount(1)
    if (!next) setWatchCount(0)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      // user_episodes: presenza = visto
      if (isWatched) {
        await supabase.from('user_episodes').upsert({
          user_id: user.id,
          tmdb_show_id: tmdbShowId,
          season_number: seasonNumber,
          episode_number: episode.episode_number,
          watched_at: new Date(watchedDate).toISOString()
        }, { onConflict: 'user_id,tmdb_show_id,season_number,episode_number' })
      } else {
        await supabase.from('user_episodes').delete()
          .eq('user_id', user.id)
          .eq('tmdb_show_id', tmdbShowId)
          .eq('season_number', seasonNumber)
          .eq('episode_number', episode.episode_number)
      }

      // episode_details: dettagli sempre salvati se c'è qualcosa da salvare
      const detailPayload = {
        user_id: user.id,
        tmdb_show_id: tmdbShowId,
        season_number: seasonNumber,
        episode_number: episode.episode_number,
        rating: rating || null,
        emotions: JSON.stringify(emotions),
        fav_character: favCharacter || null,
        platform: platform || null,
        device: device || null,
        watch_count: watchCount,
        note: note || null,
        watched_date: isWatched ? watchedDate : (details?.watched_date || null),
        updated_at: new Date().toISOString()
      }
      const { data: savedDetails } = await supabase
        .from('episode_details')
        .upsert(detailPayload, { onConflict: 'user_id,tmdb_show_id,season_number,episode_number' })
        .select()
        .single()

      onSaved({ watched: isWatched, details: savedDetails })
      onClose()
    } catch (err) {
      console.error(err)
      alert('Errore nel salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h3 style={{ fontSize: 18 }}>Ep. {episode.episode_number} — {episode.name}</h3>
          <button className="sheet-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--subtext)', marginBottom: 16 }}>
          {episode.vote_average > 0 && <span>Voto TMDB: {episode.vote_average.toFixed(1)}</span>}
          {episode.runtime && <span>Durata: {episode.runtime}min</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontWeight: 600 }}>Visto</span>
          <button
            onClick={toggleWatchedSwitch}
            className={isWatched ? 'btn' : 'btn secondary'}
          >
            {isWatched ? '✓ Visto' : 'Segna come visto'}
          </button>
        </div>

        {isWatched && (
          <div className="field">
            <label>Data visione</label>
            <input type="date" value={watchedDate} onChange={(e) => setWatchedDate(e.target.value)} />
          </div>
        )}

        <div className="field">
          <label>Voto episodio</label>
          <StarRating value={rating} max={5} onChange={setRating} />
        </div>

        <div className="field">
          <label>Emozioni</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOTIONS.map(e => (
              <button
                key={e.id}
                onClick={() => toggleEmotion(e.id)}
                className={`chip ${emotions.includes(e.id) ? 'active' : ''}`}
              >
                {e.emoji} {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Personaggio preferito</label>
          <CastPicker cast={cast} value={favCharacter} onChange={setFavCharacter} />
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Piattaforma</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">—</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Dispositivo</label>
            <select value={device} onChange={(e) => setDevice(e.target.value)}>
              <option value="">—</option>
              {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Volte visto</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn secondary" onClick={() => setWatchCount(c => Math.max(0, c - 1))}>−</button>
            <span style={{ fontSize: 18, minWidth: 24, textAlign: 'center' }}>{watchCount}</span>
            <button className="btn secondary" onClick={() => setWatchCount(c => c + 1)}>+</button>
          </div>
        </div>

        <div className="field">
          <label>Nota</label>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Scrivi una nota..." />
        </div>

        <button className="btn block" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
