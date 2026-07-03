import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PLATFORMS, DEVICES, STATUSES, MEDIA_TYPES, formatRuntime } from '../lib/tmdb'
import StarRating from './StarRating'
import CastPicker from './CastPicker'

export default function ShowSheet({ tmdbShow, existing, onClose, onSaved }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [status, setStatus] = useState(existing?.status || 'planned')
  const [mediaType, setMediaType] = useState(existing?.media_type || 'tv')
  const [rating, setRating] = useState(existing?.rating || 0)
  const [favCharacter, setFavCharacter] = useState(existing?.fav_character || '')
  const [platform, setPlatform] = useState(existing?.main_platform || '')
  const [device, setDevice] = useState(existing?.main_device || '')
  const [watchCount, setWatchCount] = useState(existing?.watch_count || 1)
  const [note, setNote] = useState(existing?.note || '')
  const [saving, setSaving] = useState(false)

  const castList = tmdbShow.aggregate_credits?.cast || []
  const cast = castList.slice(0, 20).map(c => ({
    name: c.name,
    profile_path: c.profile_path,
    character: c.roles?.[0]?.character
  }))

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        user_id: user.id,
        tmdb_id: tmdbShow.id,
        media_type: mediaType,
        status,
        rating: rating || null,
        note: note || null,
        fav_character: favCharacter || null,
        main_platform: platform || null,
        main_device: device || null,
        watch_count: watchCount,
        title: tmdbShow.name,
        original_title: tmdbShow.original_name,
        poster_path: tmdbShow.poster_path,
        backdrop_path: tmdbShow.backdrop_path,
        first_air_year: tmdbShow.first_air_date ? parseInt(tmdbShow.first_air_date.slice(0, 4)) : null,
        total_episodes: tmdbShow.number_of_episodes || null,
        episode_runtime: tmdbShow.episode_run_time?.[0] || null,
        genres: JSON.stringify((tmdbShow.genres || []).map(g => g.name)),
        updated_at: new Date().toISOString()
      }
      const { data, error } = await supabase
        .from('user_shows')
        .upsert(payload, { onConflict: 'user_id,tmdb_id' })
        .select()
        .single()
      if (error) throw error
      onSaved(data)
      showToast(existing ? 'Serie aggiornata' : 'Serie aggiunta alla libreria', 'success')
      onClose()
    } catch (err) {
      console.error('Errore salvataggio serie:', err)
      showToast(err?.message ? `Errore nel salvataggio: ${err.message}` : 'Errore nel salvataggio della serie. Riprova.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h3 style={{ fontSize: 18 }}>{tmdbShow.name}</h3>
          <button className="sheet-close" onClick={onClose}>✕</button>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Stato</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
              {MEDIA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Voto serie</label>
          <StarRating value={rating} max={10} onChange={setRating} gold size={16} />
        </div>

        <div className="field">
          <label>Personaggio preferito</label>
          <CastPicker cast={cast} value={favCharacter} onChange={setFavCharacter} />
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Piattaforma principale</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">—</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Dispositivo principale</label>
            <select value={device} onChange={(e) => setDevice(e.target.value)}>
              <option value="">—</option>
              {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Volte vista</label>
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

        {tmdbShow.episode_run_time?.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 12 }}>
            Durata media episodi: {formatRuntime(tmdbShow.episode_run_time)}
          </div>
        )}

        <button className="btn block" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvataggio...' : (existing ? 'Salva modifiche' : 'Aggiungi alla libreria')}
        </button>
      </div>
    </div>
  )
}
