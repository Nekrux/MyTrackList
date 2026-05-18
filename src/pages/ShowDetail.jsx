import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getShowDetails, getSeasonDetails, posterUrl, backdropUrl, airYear } from '../lib/tmdb'

const STATUS_OPTIONS = [
  { value: 'watching',      label: 'In corso' },
  { value: 'completed',     label: 'Completata' },
  { value: 'plan_to_watch', label: 'Da vedere' },
  { value: 'paused',        label: 'In pausa' },
  { value: 'dropped',       label: 'Abbandonata' },
]
const TYPE_OPTIONS = [
  { value: 'tv',      label: 'Serie TV' },
  { value: 'anime',   label: 'Anime' },
  { value: 'cartoon', label: 'Cartone' },
]
const PLATFORMS = ['Netflix','Prime Video','Disney+','Apple TV+','NOW','RaiPlay','Mediaset Infinity','YouTube','Blu-ray/DVD','TV','PC','Smartphone','Altro']
const EMOTIONS = [
  { emoji: '😍', label: 'Adorato' },
  { emoji: '❤️', label: 'Amato' },
  { emoji: '🔥', label: 'Epico' },
  { emoji: '🤯', label: 'Mind-blown' },
  { emoji: '😂', label: 'Divertente' },
  { emoji: '😮', label: 'Sorpresa' },
  { emoji: '😢', label: 'Commovente' },
  { emoji: '💀', label: 'Devastante' },
  { emoji: '😡', label: 'Frustrante' },
  { emoji: '😴', label: 'Noioso' },
]

function StarRating({ value, max = 5, onChange, size = 20 }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="stars">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          className={`star${(hover || value) >= n ? ' active' : ''}`}
          style={{ fontSize: size }}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n === value ? null : n)}
        >★</button>
      ))}
    </div>
  )
}

// ── Episode detail sheet ──────────────────────────────────────────────────────
function EpisodeSheet({ ep, showId, userId, detail, onSave, onClose }) {
  const [watched,   setWatched]   = useState(!!ep.watched)
  const [rating,    setRating]    = useState(detail?.rating || null)
  const [emotion,   setEmotion]   = useState(detail?.emotion || null)
  const [character, setCharacter] = useState(detail?.fav_character || '')
  const [platform,  setPlatform]  = useState(detail?.platform || null)
  const [watchCount,setWatchCount]= useState(detail?.watch_count || 1)
  const [note,      setNote]      = useState(detail?.note || '')
  const [saving,    setSaving]    = useState(false)

  const save = async () => {
    setSaving(true)
    await onSave({
      watched,
      season_number: ep.season_number,
      episode_number: ep.episode_number,
      rating: rating || null,
      emotion: emotion || null,
      fav_character: character || null,
      platform: platform || null,
      watch_count: watchCount,
      note: note || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-title" style={{ fontSize: '1.3rem' }}>
          {ep.season_number}×{String(ep.episode_number).padStart(2,'0')} — {ep.name || `Episodio ${ep.episode_number}`}
        </div>

        {/* Watched toggle */}
        <div className="sheet-row">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div
              onClick={() => setWatched(w => !w)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: watched ? 'var(--accent)' : 'var(--border)',
                position: 'relative', transition: 'background .2s', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: watched ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: 'white', transition: 'left .2s',
              }} />
            </div>
            <span style={{ fontSize: 14 }}>{watched ? 'Visto ✓' : 'Non visto'}</span>
          </label>
        </div>

        {watched && <>
          {/* Rating */}
          <div className="sheet-row">
            <div className="sheet-label">Voto episodio (1–5 stelle)</div>
            <StarRating value={rating} max={5} onChange={setRating} size={24} />
          </div>

          {/* Emotion */}
          <div className="sheet-row">
            <div className="sheet-label">Emozione</div>
            <div className="emotions-grid">
              {EMOTIONS.map(e => (
                <button
                  key={e.emoji}
                  className={`emotion-btn${emotion === e.emoji ? ' active' : ''}`}
                  onClick={() => setEmotion(emotion === e.emoji ? null : e.emoji)}
                >
                  {e.emoji}
                  <span>{e.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fav character */}
          <div className="sheet-row">
            <div className="sheet-label">Personaggio preferito</div>
            <input
              className="input"
              placeholder="Es. Walter White"
              value={character}
              onChange={e => setCharacter(e.target.value)}
            />
          </div>

          {/* Platform */}
          <div className="sheet-row">
            <div className="sheet-label">Piattaforma</div>
            <div className="platform-grid">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  className={`platform-chip${platform === p ? ' active' : ''}`}
                  onClick={() => setPlatform(platform === p ? null : p)}
                >{p}</button>
              ))}
            </div>
          </div>

          {/* Watch count */}
          <div className="sheet-row">
            <div className="sheet-label">Volte visto</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 18 }}
                onClick={() => setWatchCount(c => Math.max(1, c - 1))}>−</button>
              <span style={{ fontSize: 18, fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{watchCount}</span>
              <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 18 }}
                onClick={() => setWatchCount(c => c + 1)}>+</button>
            </div>
          </div>

          {/* Note */}
          <div className="sheet-row">
            <div className="sheet-label">Nota</div>
            <textarea className="input textarea" placeholder="Pensieri sull'episodio..." value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </>}

        <div className="sheet-actions">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Salvo...' : 'Salva'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Annulla</button>
        </div>
      </div>
    </div>
  )
}

// ── Season block ──────────────────────────────────────────────────────────────
function SeasonBlock({ showId, season, userId, watchedSet, detailsMap, onToggle, onEpClick }) {
  const [open,    setOpen]    = useState(false)
  const [eps,     setEps]     = useState(null)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (!open && !eps) {
      setLoading(true)
      try {
        const data = await getSeasonDetails(showId, season.season_number)
        setEps(data.episodes || [])
      } catch { setEps([]) }
      setLoading(false)
    }
    setOpen(o => !o)
  }

  const realEps = eps?.filter(e => e.episode_number > 0) ?? []
  const watchedInSeason = realEps.filter(e => watchedSet.has(`${season.season_number}-${e.episode_number}`)).length

  return (
    <div className="season-block">
      <div className="season-header" onClick={toggle}>
        <span className="season-title">{season.name || `Stagione ${season.season_number}`}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="season-prog">{watchedInSeason}/{season.episode_count} ep</span>
          <span style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
        </span>
      </div>

      {open && (
        <div className="episode-list">
          {loading ? (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto', width: 24, height: 24 }} />
            </div>
          ) : (
            <>
              {realEps.map(ep => {
                const key    = `${season.season_number}-${ep.episode_number}`
                const done   = watchedSet.has(key)
                const detail = detailsMap[key]
                return (
                  <div
                    key={ep.id}
                    className={`episode-row${done ? ' watched' : ''}`}
                    onClick={() => onEpClick({ ...ep, season_number: season.season_number, watched: done })}
                  >
                    <button
                      className={`ep-check${done ? ' done' : ''}`}
                      tabIndex={-1}
                      onClick={e => { e.stopPropagation(); onToggle(season.season_number, ep.episode_number, !done) }}
                    >
                      {done ? '✓' : ''}
                    </button>
                    <span className="ep-num">{ep.episode_number}</span>
                    <span className="ep-name">{ep.name || `Episodio ${ep.episode_number}`}</span>
                    <span className="ep-meta">
                      {detail?.emotion && <span>{detail.emotion}</span>}
                      {detail?.rating && (
                        <span className="ep-score-badge">{'★'.repeat(detail.rating)}</span>
                      )}
                      {ep.runtime && <span>{ep.runtime}m</span>}
                    </span>
                  </div>
                )
              })}
              <div className="season-actions">
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }}
                  onClick={() => realEps.forEach(ep => onToggle(season.season_number, ep.episode_number, true))}>
                  ✓ Segna tutti
                </button>
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }}
                  onClick={() => realEps.forEach(ep => onToggle(season.season_number, ep.episode_number, false))}>
                  ✗ Deseleziona
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ShowDetail() {
  const { id }   = useParams()
  const tmdbId   = parseInt(id)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [show,        setShow]        = useState(null)
  const [userShow,    setUserShow]    = useState(null)
  const [watchedSet,  setWatchedSet]  = useState(new Set())
  const [detailsMap,  setDetailsMap]  = useState({})
  const [loading,     setLoading]     = useState(true)
  const [sheet,       setSheet]       = useState(false)
  const [epSheet,     setEpSheet]     = useState(null) // { ep, detail }

  // Show edit state
  const [status,    setStatus]    = useState('plan_to_watch')
  const [mediaType, setMType]     = useState('tv')
  const [rating,    setRating]    = useState(null)
  const [note,      setNote]      = useState('')
  const [favChar,   setFavChar]   = useState('')
  const [platform,  setPlatform]  = useState(null)
  const [watchCount,setWatchCount]= useState(1)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { load() }, [id])

  const load = async () => {
    setLoading(true)
    try {
      const [tmdb, { data: us }, { data: eps }, { data: details }] = await Promise.all([
        getShowDetails(tmdbId),
        supabase.from('user_shows').select('*').eq('user_id', user.id).eq('tmdb_id', tmdbId).maybeSingle(),
        supabase.from('user_episodes').select('season_number,episode_number').eq('user_id', user.id).eq('tmdb_show_id', tmdbId),
        supabase.from('episode_details').select('*').eq('user_id', user.id).eq('tmdb_show_id', tmdbId),
      ])
      setShow(tmdb)
      setUserShow(us)
      if (us) { setStatus(us.status); setMType(us.media_type); setRating(us.rating); setNote(us.note||''); setFavChar(us.fav_character||''); setPlatform(us.main_platform||null); setWatchCount(us.watch_count||1) }
      if (eps) setWatchedSet(new Set(eps.map(e => `${e.season_number}-${e.episode_number}`)))
      if (details) {
        const map = {}
        details.forEach(d => { map[`${d.season_number}-${d.episode_number}`] = d })
        setDetailsMap(map)
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleToggleEp = useCallback(async (seasonN, epN, watched) => {
    const key = `${seasonN}-${epN}`
    setWatchedSet(prev => { const n = new Set(prev); watched ? n.add(key) : n.delete(key); return n })
    if (watched) {
      await supabase.from('user_episodes').upsert({ user_id: user.id, tmdb_show_id: tmdbId, season_number: seasonN, episode_number: epN }, { onConflict: 'user_id,tmdb_show_id,season_number,episode_number' })
    } else {
      await supabase.from('user_episodes').delete().eq('user_id', user.id).eq('tmdb_show_id', tmdbId).eq('season_number', seasonN).eq('episode_number', epN)
    }
  }, [tmdbId, user.id])

  const handleSaveEpDetail = useCallback(async ({ watched, season_number, episode_number, ...detail }) => {
    const key = `${season_number}-${episode_number}`
    // Toggle watched
    const isWatched = watchedSet.has(key)
    if (watched !== isWatched) await handleToggleEp(season_number, episode_number, watched)
    // Save details
    await supabase.from('episode_details').upsert({
      user_id: user.id, tmdb_show_id: tmdbId, season_number, episode_number, ...detail, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,tmdb_show_id,season_number,episode_number' })
    setDetailsMap(prev => ({ ...prev, [key]: { ...prev[key], ...detail } }))
  }, [tmdbId, user.id, watchedSet, handleToggleEp])

  const saveToLibrary = async () => {
    setSaving(true)
    const totalEps = show?.seasons?.filter(s => s.season_number > 0).reduce((a, s) => a + (s.episode_count || 0), 0) || 0
    const payload = {
      user_id: user.id, tmdb_id: tmdbId, media_type: mediaType, status,
      rating: rating || null, note: note || null,
      fav_character: favChar || null, main_platform: platform || null, watch_count: watchCount,
      title: show?.name || '', original_title: show?.original_name || '',
      poster_path: show?.poster_path || null, backdrop_path: show?.backdrop_path || null,
      first_air_year: airYear(show?.first_air_date),
      total_episodes: totalEps, episode_runtime: show?.episode_run_time?.[0] || 25,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('user_shows').upsert(payload, { onConflict: 'user_id,tmdb_id' }).select().single()
    if (!error) setUserShow(data)
    setSheet(false); setSaving(false)
  }

  const removeFromLibrary = async () => {
    if (!confirm('Rimuovere dalla libreria?')) return
    await supabase.from('user_shows').delete().eq('user_id', user.id).eq('tmdb_id', tmdbId)
    await supabase.from('user_episodes').delete().eq('user_id', user.id).eq('tmdb_show_id', tmdbId)
    setUserShow(null); setWatchedSet(new Set()); setSheet(false)
  }

  // Calcola voto medio episodi ×2
  const epRatings = Object.values(detailsMap).map(d => d.rating).filter(Boolean)
  const avgEpScore = epRatings.length
    ? ((epRatings.reduce((a, b) => a + b, 0) / epRatings.length) * 2).toFixed(1)
    : null

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!show)   return <div className="page"><p>Errore nel caricamento.</p></div>

  const backdrop = backdropUrl(show.backdrop_path)
  const poster   = posterUrl(show.poster_path, 'w342')
  const seasons  = show.seasons?.filter(s => s.season_number > 0) || []
  const totalEps = seasons.reduce((a, s) => a + (s.episode_count || 0), 0)

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      {backdrop && <div className="backdrop"><img src={backdrop} alt="" /></div>}

      <div style={{ marginTop: backdrop ? -40 : 20 }}>
        <div className="detail-header">
          {poster && <img src={poster} alt={show.name} className="detail-poster" />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="detail-title">{show.name}</h1>
            <div className="detail-meta">
              {airYear(show.first_air_date)}{show.number_of_seasons && ` · ${show.number_of_seasons} stagioni`}{totalEps > 0 && ` · ${totalEps} ep`}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {show.genres?.map(g => (
                <span key={g.id} className="badge" style={{ background: 'var(--surface-hi)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>{g.name}</span>
              ))}
            </div>
            {avgEpScore && (
              <div style={{ marginTop: 8 }}>
                <span className="ep-score-badge" style={{ fontSize: 13 }}>
                  ★ {avgEpScore}/10 <span style={{ opacity: .6, fontSize: 11 }}>media ep.</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => setSheet(true)} style={{ width: '100%', marginBottom: 16 }}>
          {userShow ? '✎ Modifica in libreria' : '+ Aggiungi alla libreria'}
        </button>

        {show.overview && (
          <>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 16 }}>{show.overview}</p>
            <div className="divider" />
          </>
        )}

        {userShow && totalEps > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="label">Progresso</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 6 }}>
              {watchedSet.size} / {totalEps} ep ({Math.round(watchedSet.size / totalEps * 100)}%)
            </div>
            <div className="progress-bar" style={{ height: 5 }}>
              <div className="progress-fill" style={{ width: `${(watchedSet.size / totalEps) * 100}%` }} />
            </div>
          </div>
        )}

        {seasons.length > 0 && (
          <>
            <div className="label" style={{ marginBottom: 10 }}>Stagioni</div>
            {seasons.map(s => (
              <SeasonBlock
                key={s.id} showId={tmdbId} season={s}
                userId={user.id} watchedSet={watchedSet} detailsMap={detailsMap}
                onToggle={handleToggleEp}
                onEpClick={ep => setEpSheet({ ep, detail: detailsMap[`${ep.season_number}-${ep.episode_number}`] })}
              />
            ))}
          </>
        )}
      </div>

      {/* Show edit sheet */}
      {sheet && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setSheet(false)}>
          <div className="sheet">
            <h2 className="sheet-title">{show.name}</h2>

            <div className="sheet-row">
              <div className="sheet-label">Stato</div>
              <select className="status-select" value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="sheet-row">
              <div className="sheet-label">Tipo</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {TYPE_OPTIONS.map(o => (
                  <button key={o.value} className={`chip${mediaType === o.value ? ' active' : ''}`} onClick={() => setMType(o.value)}>{o.label}</button>
                ))}
              </div>
            </div>

            <div className="sheet-row">
              <div className="sheet-label">Voto serie (1–10)</div>
              <StarRating value={rating} max={10} onChange={setRating} size={22} />
            </div>

            <div className="sheet-row">
              <div className="sheet-label">Personaggio preferito</div>
              <input className="input" placeholder="Es. Levi Ackermann" value={favChar} onChange={e => setFavChar(e.target.value)} />
            </div>

            <div className="sheet-row">
              <div className="sheet-label">Piattaforma principale</div>
              <div className="platform-grid">
                {PLATFORMS.map(p => (
                  <button key={p} className={`platform-chip${platform === p ? ' active' : ''}`} onClick={() => setPlatform(platform === p ? null : p)}>{p}</button>
                ))}
              </div>
            </div>

            <div className="sheet-row">
              <div className="sheet-label">Volte vista</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 18 }} onClick={() => setWatchCount(c => Math.max(1, c - 1))}>−</button>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{watchCount}</span>
                <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 18 }} onClick={() => setWatchCount(c => c + 1)}>+</button>
              </div>
            </div>

            <div className="sheet-row">
              <div className="sheet-label">Note</div>
              <textarea className="input textarea" placeholder="Pensieri, commenti..." value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <div className="sheet-actions">
              <button className="btn btn-primary" onClick={saveToLibrary} disabled={saving}>{saving ? 'Salvo...' : 'Salva'}</button>
              {userShow && <button className="btn btn-danger" onClick={removeFromLibrary}>Rimuovi</button>}
            </div>
          </div>
        </div>
      )}

      {/* Episode detail sheet */}
      {epSheet && (
        <EpisodeSheet
          ep={epSheet.ep} showId={tmdbId} userId={user.id} detail={epSheet.detail}
          onSave={handleSaveEpDetail}
          onClose={() => setEpSheet(null)}
        />
      )}
    </div>
  )
}
