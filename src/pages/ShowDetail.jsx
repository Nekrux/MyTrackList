import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  getShowDetails, getSeasonDetails,
  posterUrl, backdropUrl, airYear
} from '../lib/tmdb'

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

// ── Season accordion ─────────────────────────────────────────────────────────
function SeasonBlock({ showId, season, userId, watchedSet, onToggle }) {
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
  const watchedInSeason = realEps.filter(e =>
    watchedSet.has(`${season.season_number}-${e.episode_number}`)
  ).length

  const markAll = async (watched) => {
    if (!eps) return
    for (const ep of realEps) {
      await onToggle(season.season_number, ep.episode_number, watched)
    }
  }

  return (
    <div className="season-block">
      <div className="season-header" onClick={toggle}>
        <span className="season-title">
          {season.name || `Stagione ${season.season_number}`}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="season-prog">
            {watchedInSeason}/{season.episode_count} ep
          </span>
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
                return (
                  <div
                    key={ep.id}
                    className={`episode-row${done ? ' watched' : ''}`}
                    onClick={() => onToggle(season.season_number, ep.episode_number, !done)}
                  >
                    <button className={`ep-check${done ? ' done' : ''}`} tabIndex={-1}>
                      {done ? '✓' : ''}
                    </button>
                    <span className="ep-num">{ep.episode_number}</span>
                    <span className="ep-name">{ep.name || `Episodio ${ep.episode_number}`}</span>
                    {ep.runtime && (
                      <span className="ep-runtime">{ep.runtime}m</span>
                    )}
                  </div>
                )
              })}
              <div className="season-actions">
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }}
                  onClick={() => markAll(true)}>
                  ✓ Segna tutti
                </button>
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }}
                  onClick={() => markAll(false)}>
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

// ── Stars rating ─────────────────────────────────────────────────────────────
function Stars({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="stars">
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button
          key={n}
          className={`star${(hover || value) >= n ? ' active' : ''}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n === value ? null : n)}
          style={{ fontSize: 20 }}
        >★</button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ShowDetail() {
  const { id }  = useParams()
  const tmdbId  = parseInt(id)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [show,       setShow]       = useState(null)
  const [userShow,   setUserShow]   = useState(null)
  const [watchedSet, setWatchedSet] = useState(new Set())
  const [loading,    setLoading]    = useState(true)

  // Edit sheet state
  const [sheet,    setSheet]    = useState(false)
  const [status,   setStatus]   = useState('plan_to_watch')
  const [mediaType,setMType]    = useState('tv')
  const [rating,   setRating]   = useState(null)
  const [note,     setNote]     = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    setLoading(true)
    try {
      const [tmdb, { data: us }, { data: eps }] = await Promise.all([
        getShowDetails(tmdbId),
        supabase.from('user_shows').select('*').eq('user_id', user.id).eq('tmdb_id', tmdbId).maybeSingle(),
        supabase.from('user_episodes').select('season_number,episode_number').eq('user_id', user.id).eq('tmdb_show_id', tmdbId)
      ])
      setShow(tmdb)
      setUserShow(us)
      if (us) {
        setStatus(us.status)
        setMType(us.media_type)
        setRating(us.rating)
        setNote(us.note || '')
      }
      if (eps) {
        setWatchedSet(new Set(eps.map(e => `${e.season_number}-${e.episode_number}`)))
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleToggleEp = useCallback(async (seasonN, epN, watched) => {
    const key = `${seasonN}-${epN}`
    // Optimistic update
    setWatchedSet(prev => {
      const next = new Set(prev)
      watched ? next.add(key) : next.delete(key)
      return next
    })
    if (watched) {
      await supabase.from('user_episodes').upsert({
        user_id: user.id, tmdb_show_id: tmdbId, season_number: seasonN, episode_number: epN
      }, { onConflict: 'user_id,tmdb_show_id,season_number,episode_number' })
    } else {
      await supabase.from('user_episodes').delete()
        .eq('user_id', user.id).eq('tmdb_show_id', tmdbId)
        .eq('season_number', seasonN).eq('episode_number', epN)
    }
  }, [tmdbId, user.id])

  const saveToLibrary = async () => {
    setSaving(true)
    const totalEps = show?.seasons
      ?.filter(s => s.season_number > 0)
      .reduce((acc, s) => acc + (s.episode_count || 0), 0) || 0

    const payload = {
      user_id:        user.id,
      tmdb_id:        tmdbId,
      media_type:     mediaType,
      status,
      rating:         rating || null,
      note:           note || null,
      title:          show?.name || show?.original_name || '',
      original_title: show?.original_name || '',
      poster_path:    show?.poster_path || null,
      backdrop_path:  show?.backdrop_path || null,
      first_air_year: airYear(show?.first_air_date),
      total_episodes: totalEps,
      episode_runtime: show?.episode_run_time?.[0] || 25,
      updated_at:     new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('user_shows')
      .upsert(payload, { onConflict: 'user_id,tmdb_id' })
      .select().single()

    if (!error) setUserShow(data)
    setSheet(false)
    setSaving(false)
  }

  const removeFromLibrary = async () => {
    if (!confirm('Rimuovere dalla libreria?')) return
    await supabase.from('user_shows').delete().eq('user_id', user.id).eq('tmdb_id', tmdbId)
    await supabase.from('user_episodes').delete().eq('user_id', user.id).eq('tmdb_show_id', tmdbId)
    setUserShow(null)
    setWatchedSet(new Set())
    setSheet(false)
  }

  const openSheet = () => {
    if (userShow) {
      setStatus(userShow.status)
      setMType(userShow.media_type)
      setRating(userShow.rating)
      setNote(userShow.note || '')
    }
    setSheet(true)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!show)   return <div className="page"><p>Errore nel caricamento.</p></div>

  const backdrop = backdropUrl(show.backdrop_path)
  const poster   = posterUrl(show.poster_path, 'w342')
  const seasons  = show.seasons?.filter(s => s.season_number > 0) || []
  const totalEps = seasons.reduce((a, s) => a + (s.episode_count || 0), 0)
  const watchedCount = watchedSet.size

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      {/* Backdrop */}
      {backdrop && (
        <div className="backdrop">
          <img src={backdrop} alt="" />
        </div>
      )}

      <div style={{ padding: '0 0 0 0', marginTop: backdrop ? -40 : 20 }}>
        {/* Header */}
        <div className="detail-header">
          {poster && <img src={poster} alt={show.name} className="detail-poster" />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="detail-title">{show.name}</h1>
            <div className="detail-meta">
              {airYear(show.first_air_date)}
              {show.number_of_seasons && ` · ${show.number_of_seasons} stagioni`}
              {totalEps > 0 && ` · ${totalEps} ep`}
              {show.status && ` · ${show.status}`}
            </div>
            {show.genres?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {show.genres.map(g => (
                  <span key={g.id} className="badge" style={{ background: 'var(--surface-hi)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action button */}
        <button className="btn btn-primary" onClick={openSheet} style={{ width: '100%', marginBottom: 16 }}>
          {userShow ? '✎ Modifica in libreria' : '+ Aggiungi alla libreria'}
        </button>

        {/* Overview */}
        {show.overview && (
          <>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 16 }}>
              {show.overview}
            </p>
            <div className="divider" />
          </>
        )}

        {/* Progress */}
        {userShow && totalEps > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="label">Progresso</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 6 }}>
              {watchedCount} / {totalEps} episodi ({Math.round(watchedCount/totalEps*100)}%)
            </div>
            <div className="progress-bar" style={{ height: 5 }}>
              <div className="progress-fill" style={{ width: `${(watchedCount/totalEps)*100}%` }} />
            </div>
          </div>
        )}

        {/* Seasons */}
        {seasons.length > 0 && (
          <>
            <div className="label" style={{ marginBottom: 10 }}>Stagioni</div>
            {seasons.map(s => (
              <SeasonBlock
                key={s.id}
                showId={tmdbId}
                season={s}
                userId={user.id}
                watchedSet={watchedSet}
                onToggle={handleToggleEp}
              />
            ))}
          </>
        )}
      </div>

      {/* Edit Sheet */}
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
                  <button
                    key={o.value}
                    className={`chip${mediaType === o.value ? ' active' : ''}`}
                    onClick={() => setMType(o.value)}
                  >{o.label}</button>
                ))}
              </div>
            </div>

            <div className="sheet-row">
              <div className="sheet-label">Voto (1–10)</div>
              <Stars value={rating} onChange={setRating} />
              {rating && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  {rating}/10 — <button onClick={() => setRating(null)} style={{ background: 'none', color: 'var(--danger)', fontSize: 12 }}>Rimuovi</button>
                </div>
              )}
            </div>

            <div className="sheet-row">
              <div className="sheet-label">Note personali</div>
              <textarea
                className="input textarea"
                placeholder="Pensieri, commenti, dove eri rimasto..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <div className="sheet-actions">
              <button className="btn btn-primary" onClick={saveToLibrary} disabled={saving}>
                {saving ? 'Salvo...' : 'Salva'}
              </button>
              {userShow && (
                <button className="btn btn-danger" onClick={removeFromLibrary}>
                  Rimuovi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
