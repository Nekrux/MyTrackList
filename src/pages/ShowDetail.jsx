import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  getShowDetails, getSeasonDetails, posterUrl, backdropUrl, profileUrl, formatRuntime, STATUSES
} from '../lib/tmdb'
import Spinner from '../components/Spinner'
import ShowSheet from '../components/ShowSheet'
import EpisodeSheet from '../components/EpisodeSheet'
import EpisodeRow from '../components/EpisodeRow'

const STATUS_LABEL = Object.fromEntries(STATUSES.map(s => [s.value, s.label]))

export default function ShowDetail() {
  const { tmdbId } = useParams()
  const { user } = useAuth()
  const showId = parseInt(tmdbId, 10)

  const [tmdbShow, setTmdbShow] = useState(null)
  const [userShow, setUserShow] = useState(null)
  const [watchedSet, setWatchedSet] = useState(new Set())
  const [detailsMap, setDetailsMap] = useState({})
  const [seasonTracking, setSeasonTracking] = useState({})
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSheetOpen, setShowSheetOpen] = useState(false)
  const [expandedSeason, setExpandedSeason] = useState(null)
  const [seasonEpisodes, setSeasonEpisodes] = useState({})
  const [loadingSeason, setLoadingSeason] = useState(null)
  const [activeEpisode, setActiveEpisode] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const details = await getShowDetails(showId)
    setTmdbShow(details)

    if (user) {
      const [{ data: us }, { data: eps }, { data: eds }, { data: st }, { data: fav }] = await Promise.all([
        supabase.from('user_shows').select('*').eq('user_id', user.id).eq('tmdb_id', showId).maybeSingle(),
        supabase.from('user_episodes').select('*').eq('user_id', user.id).eq('tmdb_show_id', showId),
        supabase.from('episode_details').select('*').eq('user_id', user.id).eq('tmdb_show_id', showId),
        supabase.from('season_tracking').select('*').eq('user_id', user.id).eq('tmdb_show_id', showId),
        supabase.from('user_favorites').select('id').eq('user_id', user.id).eq('tmdb_id', showId).maybeSingle()
      ])
      setUserShow(us || null)
      setWatchedSet(new Set((eps || []).map(e => `${e.season_number}-${e.episode_number}`)))
      const dMap = {}
      ;(eds || []).forEach(d => { dMap[`${d.season_number}-${d.episode_number}`] = d })
      setDetailsMap(dMap)
      const sMap = {}
      ;(st || []).forEach(s => { sMap[s.season_number] = s })
      setSeasonTracking(sMap)
      setIsFavorite(!!fav)
    }
    setLoading(false)
  }, [showId, user])

  useEffect(() => { load() }, [load])

  async function toggleFavorite() {
    if (!user || !tmdbShow) return
    if (isFavorite) {
      await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('tmdb_id', showId)
      setIsFavorite(false)
    } else {
      const { count } = await supabase.from('user_favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if ((count || 0) >= 6) {
        alert('Puoi avere al massimo 6 serie preferite.')
        return
      }
      await supabase.from('user_favorites').insert({
        user_id: user.id, tmdb_id: showId, title: tmdbShow.name, poster_path: tmdbShow.poster_path, position: count || 0
      })
      setIsFavorite(true)
    }
  }

  async function toggleSeason(seasonNumber) {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null)
      return
    }
    setExpandedSeason(seasonNumber)
    if (!seasonEpisodes[seasonNumber]) {
      setLoadingSeason(seasonNumber)
      try {
        const data = await getSeasonDetails(showId, seasonNumber)
        setSeasonEpisodes(prev => ({ ...prev, [seasonNumber]: data.episodes || [] }))
      } finally {
        setLoadingSeason(null)
      }
    }
  }

  async function toggleEpisodeWatched(seasonNumber, episode) {
    if (!user) return
    const key = `${seasonNumber}-${episode.episode_number}`
    const isWatched = watchedSet.has(key)

    if (isWatched) {
      await supabase.from('user_episodes').delete()
        .eq('user_id', user.id).eq('tmdb_show_id', showId)
        .eq('season_number', seasonNumber).eq('episode_number', episode.episode_number)
      setWatchedSet(prev => { const s = new Set(prev); s.delete(key); return s })
    } else {
      await supabase.from('user_episodes').upsert({
        user_id: user.id, tmdb_show_id: showId, season_number: seasonNumber,
        episode_number: episode.episode_number, watched_at: new Date().toISOString()
      }, { onConflict: 'user_id,tmdb_show_id,season_number,episode_number' })
      setWatchedSet(prev => new Set(prev).add(key))

      // Auto-status: se la serie era "da vedere", passa a "in corso"
      if (userShow && userShow.status === 'planned') {
        const { data } = await supabase.from('user_shows').update({ status: 'watching', updated_at: new Date().toISOString() })
          .eq('id', userShow.id).select().single()
        setUserShow(data)
      } else if (!userShow) {
        // La serie non è ancora in libreria: aggiungila automaticamente come "in corso"
        const { data } = await supabase.from('user_shows').upsert({
          user_id: user.id, tmdb_id: showId, media_type: 'tv', status: 'watching',
          title: tmdbShow.name, original_title: tmdbShow.original_name,
          poster_path: tmdbShow.poster_path, backdrop_path: tmdbShow.backdrop_path,
          first_air_year: tmdbShow.first_air_date ? parseInt(tmdbShow.first_air_date.slice(0, 4)) : null,
          total_episodes: tmdbShow.number_of_episodes || null,
          episode_runtime: tmdbShow.episode_run_time?.[0] || null,
          genres: JSON.stringify((tmdbShow.genres || []).map(g => g.name)),
          watch_count: 1, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,tmdb_id' }).select().single()
        setUserShow(data)
      }

      // Season tracking: imposta data inizio se prima visione della stagione
      const existing = seasonTracking[seasonNumber]
      if (!existing) {
        const { data } = await supabase.from('season_tracking').upsert({
          user_id: user.id, tmdb_show_id: showId, season_number: seasonNumber,
          start_date: new Date().toISOString().slice(0, 10), watch_count: 0
        }, { onConflict: 'user_id,tmdb_show_id,season_number' }).select().single()
        setSeasonTracking(prev => ({ ...prev, [seasonNumber]: data }))
      }
    }
  }

  function openEpisodeSheet(seasonNumber, episode) {
    setActiveEpisode({ seasonNumber, episode })
  }

  function onEpisodeSaved({ watched, details }) {
    const key = `${activeEpisode.seasonNumber}-${activeEpisode.episode.episode_number}`
    setWatchedSet(prev => { const s = new Set(prev); watched ? s.add(key) : s.delete(key); return s })
    setDetailsMap(prev => ({ ...prev, [key]: details }))
  }

  async function markAllSeason(seasonNumber, mark) {
    if (!user) return
    const episodes = seasonEpisodes[seasonNumber] || []
    if (mark) {
      const rows = episodes.map(ep => ({
        user_id: user.id, tmdb_show_id: showId, season_number: seasonNumber,
        episode_number: ep.episode_number, watched_at: new Date().toISOString()
      }))
      await supabase.from('user_episodes').upsert(rows, { onConflict: 'user_id,tmdb_show_id,season_number,episode_number' })
      setWatchedSet(prev => {
        const s = new Set(prev)
        episodes.forEach(ep => s.add(`${seasonNumber}-${ep.episode_number}`))
        return s
      })
      if (userShow && userShow.status === 'planned') {
        const { data } = await supabase.from('user_shows').update({ status: 'watching' }).eq('id', userShow.id).select().single()
        setUserShow(data)
      }
    } else {
      await supabase.from('user_episodes').delete()
        .eq('user_id', user.id).eq('tmdb_show_id', showId).eq('season_number', seasonNumber)
      setWatchedSet(prev => {
        const s = new Set(prev)
        episodes.forEach(ep => s.delete(`${seasonNumber}-${ep.episode_number}`))
        return s
      })
    }
  }

  async function bumpSeasonRewatch(seasonNumber) {
    if (!user) return
    const existing = seasonTracking[seasonNumber]
    const newCount = (existing?.watch_count || 0) + 1
    const { data } = await supabase.from('season_tracking').upsert({
      user_id: user.id, tmdb_show_id: showId, season_number: seasonNumber,
      start_date: existing?.start_date || null, end_date: existing?.end_date || null, watch_count: newCount
    }, { onConflict: 'user_id,tmdb_show_id,season_number' }).select().single()
    setSeasonTracking(prev => ({ ...prev, [seasonNumber]: data }))
  }

  async function updateSeasonDate(seasonNumber, field, value) {
    if (!user) return
    const existing = seasonTracking[seasonNumber]
    const { data } = await supabase.from('season_tracking').upsert({
      user_id: user.id, tmdb_show_id: showId, season_number: seasonNumber,
      start_date: field === 'start_date' ? value : (existing?.start_date || null),
      end_date: field === 'end_date' ? value : (existing?.end_date || null),
      watch_count: existing?.watch_count || 0
    }, { onConflict: 'user_id,tmdb_show_id,season_number' }).select().single()
    setSeasonTracking(prev => ({ ...prev, [seasonNumber]: data }))
  }

  if (loading || !tmdbShow) return <Spinner label="Caricamento serie..." />

  const seasons = (tmdbShow.seasons || []).filter(s => s.season_number > 0)
  const totalEpisodesWatched = watchedSet.size
  const totalEpisodes = tmdbShow.number_of_episodes || 0
  const progress = totalEpisodes > 0 ? Math.min(100, Math.round((totalEpisodesWatched / totalEpisodes) * 100)) : 0

  const episodeRatings = Object.values(detailsMap).map(d => d.rating).filter(r => r > 0)
  const avgEpisodeRating = episodeRatings.length > 0
    ? (episodeRatings.reduce((a, b) => a + b, 0) / episodeRatings.length) * 2
    : null

  const cast = (tmdbShow.aggregate_credits?.cast || []).slice(0, 15)

  return (
    <div className="page" style={{ padding: 0 }}>
      <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
        {tmdbShow.backdrop_path ? (
          <img src={backdropUrl(tmdbShow.backdrop_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--surface)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(30,30,46,0.15) 0%, rgba(30,30,46,0.85) 75%, var(--bg) 100%)' }} />
      </div>

      <div style={{ padding: '0 16px', marginTop: -64, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 12 }}>
          <div className="gold-border" style={{ width: 96, minWidth: 96, aspectRatio: '2/3', overflow: 'hidden', background: 'var(--surface)' }}>
            {tmdbShow.poster_path && (
              <img src={posterUrl(tmdbShow.poster_path)} alt={tmdbShow.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <h1 style={{ fontSize: 26, lineHeight: 1.1 }}>{tmdbShow.name}</h1>
            <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 4 }}>
              {tmdbShow.first_air_date?.slice(0, 4) || '—'} · {tmdbShow.number_of_seasons} stagioni · {tmdbShow.number_of_episodes} episodi
              {tmdbShow.episode_run_time?.length > 0 && <> · {formatRuntime(tmdbShow.episode_run_time)}</>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          {tmdbShow.vote_average > 0 && (
            <span className="badge">TMDB {tmdbShow.vote_average.toFixed(1)} ({tmdbShow.vote_count})</span>
          )}
          {avgEpisodeRating && <span className="badge gold">Media episodi {avgEpisodeRating.toFixed(1)}/10</span>}
          {userShow && <span className={`badge status-${userShow.status}`}>{STATUS_LABEL[userShow.status]}</span>}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {(tmdbShow.genres || []).map(g => <span key={g.id} className="badge">{g.name}</span>)}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button className="btn" onClick={() => setShowSheetOpen(true)}>
            {userShow ? '✎ Modifica' : '+ Aggiungi'}
          </button>
          <button
            className="btn secondary"
            onClick={toggleFavorite}
            style={{ color: isFavorite ? 'var(--gold)' : 'var(--text)' }}
          >
            {isFavorite ? '★ Preferita' : '☆ Preferisci'}
          </button>
        </div>

        {tmdbShow.overview && (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--subtext)', marginBottom: 20 }}>{tmdbShow.overview}</p>
        )}

        {totalEpisodes > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--subtext)', marginBottom: 6 }}>
              <span>Progresso episodi</span>
              <span>{totalEpisodesWatched}/{totalEpisodes}</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        <h2 className="section-title">Stagioni</h2>
        <div style={{ marginBottom: 28 }}>
          {seasons.map(season => {
            const isOpen = expandedSeason === season.season_number
            const episodes = seasonEpisodes[season.season_number]
            const watchedInSeason = (episodes || []).filter(ep => watchedSet.has(`${season.season_number}-${ep.episode_number}`)).length
            const tracking = seasonTracking[season.season_number]

            return (
              <div key={season.id} className="card" style={{ marginBottom: 8 }}>
                <button
                  onClick={() => toggleSeason(season.season_number)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, textAlign: 'left' }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{season.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 2 }}>
                      {episodes ? `${watchedInSeason}/${episodes.length} episodi` : `${season.episode_count} episodi`}
                      {tracking?.watch_count > 0 && <span style={{ color: 'var(--mauve)' }}> · ×{tracking.watch_count}</span>}
                    </div>
                  </div>
                  <span style={{ color: 'var(--subtext)', fontSize: 18 }}>{isOpen ? '−' : '+'}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 14px 14px' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Inizio</label>
                        <input type="date" value={tracking?.start_date || ''} onChange={(e) => updateSeasonDate(season.season_number, 'start_date', e.target.value)} />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Fine</label>
                        <input type="date" value={tracking?.end_date || ''} onChange={(e) => updateSeasonDate(season.season_number, 'end_date', e.target.value)} />
                      </div>
                      <button className="btn ghost" onClick={() => bumpSeasonRewatch(season.season_number)} style={{ marginTop: 18 }}>
                        ↻ Rewatch (×{tracking?.watch_count || 0})
                      </button>
                    </div>

                    {loadingSeason === season.season_number ? (
                      <Spinner label="Caricamento episodi..." />
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                          <button className="btn secondary" onClick={() => markAllSeason(season.season_number, true)}>Segna tutti</button>
                          <button className="btn secondary" onClick={() => markAllSeason(season.season_number, false)}>Deseleziona</button>
                        </div>
                        {(episodes || []).map(ep => (
                          <EpisodeRow
                            key={ep.id}
                            episode={ep}
                            watched={watchedSet.has(`${season.season_number}-${ep.episode_number}`)}
                            details={detailsMap[`${season.season_number}-${ep.episode_number}`]}
                            onToggleWatched={() => toggleEpisodeWatched(season.season_number, ep)}
                            onOpen={() => openEpisodeSheet(season.season_number, ep)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {cast.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 className="section-title">Cast</h2>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {cast.map(c => (
                <div key={c.id} style={{ flexShrink: 0, width: 76, textAlign: 'center' }}>
                  <div style={{ width: 76, height: 76, overflow: 'hidden', background: 'var(--surface-hover)', marginBottom: 6 }}>
                    {c.profile_path ? (
                      <img src={profileUrl(c.profile_path)} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--subtext)' }}>?</div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--subtext)', lineHeight: 1.2 }}>{c.roles?.[0]?.character}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSheetOpen && (
        <ShowSheet
          tmdbShow={tmdbShow}
          existing={userShow}
          onClose={() => setShowSheetOpen(false)}
          onSaved={(data) => setUserShow(data)}
        />
      )}

      {activeEpisode && (
        <EpisodeSheet
          tmdbShowId={showId}
          seasonNumber={activeEpisode.seasonNumber}
          episode={activeEpisode.episode}
          watched={watchedSet.has(`${activeEpisode.seasonNumber}-${activeEpisode.episode.episode_number}`)}
          details={detailsMap[`${activeEpisode.seasonNumber}-${activeEpisode.episode.episode_number}`]}
          onClose={() => setActiveEpisode(null)}
          onSaved={onEpisodeSaved}
        />
      )}
    </div>
  )
}
