import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getShow, backdropUrl, posterUrl, profileUrl, avgRuntime, runtimeRange, yearOf, genreNames } from '../lib/tmdb'
import { imdbShowRating } from '../lib/omdb'
import { malByTitle } from '../lib/jikan'
import {
  getUserShow, upsertShow, deleteShow, getWatchedEpisodes, getEpisodeDetails, getSeasonTracking,
  markEpisode, unmarkEpisode, upsertSeasonTracking, listFavorites, addFavorite, removeFavorite,
} from '../lib/db'
import { Loader } from '../components/ui'
import RatingBadges from '../components/RatingBadges'
import ShowSheet from '../components/ShowSheet'
import EpisodeSheet from '../components/EpisodeSheet'
import SeasonAccordion from '../components/SeasonAccordion'
import ConfirmInline from '../components/ConfirmInline'

const key = (s, e) => `${s}:${e}`
const parseArr = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }

function guessType(show) {
  const isAnim = (show.genres || []).some(g => g.id === 16)
  if (!isAnim) return 'serie'
  return show.original_language === 'ja' ? 'anime' : 'cartone'
}

export default function ShowDetail() {
  const { tmdbId } = useParams()
  const id = Number(tmdbId)
  const { user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()

  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(null)
  const [userShow, setUserShow] = useState(null)
  const [watchedSet, setWatchedSet] = useState(new Set())
  const [detailsMap, setDetailsMap] = useState(new Map())
  const [trackMap, setTrackMap] = useState(new Map())
  const [isFav, setIsFav] = useState(false)
  const [favCount, setFavCount] = useState(0)

  const [showSheet, setShowSheet] = useState(false)
  const [savingShow, setSavingShow] = useState(false)
  const [epTarget, setEpTarget] = useState(null) // { season, episode }

  const imdbId = show?.external_ids?.imdb_id || null

  const castNorm = useMemo(() => {
    const cast = show?.aggregate_credits?.cast || []
    return cast.slice(0, 40).map(c => ({
      character: c.roles?.[0]?.character || c.character || '',
      actor: c.name, profile_path: c.profile_path,
    }))
  }, [show])

  const reloadUserData = async () => {
    const [us, eps, dets, tracks, favs] = await Promise.all([
      getUserShow(user.id, id), getWatchedEpisodes(user.id, id), getEpisodeDetails(user.id, id),
      getSeasonTracking(user.id, id), listFavorites(user.id),
    ])
    setUserShow(us)
    setWatchedSet(new Set(eps.map(e => key(e.season_number, e.episode_number))))
    setDetailsMap(new Map(dets.map(d => [key(d.season_number, d.episode_number), d])))
    setTrackMap(new Map(tracks.map(t => [t.season_number, t])))
    setFavCount(favs.length)
    setIsFav(favs.some(f => f.tmdb_id === id))
  }

  useEffect(() => {
    let on = true
    ;(async () => {
      setLoading(true)
      try {
        const s = await getShow(id)
        if (!on) return
        setShow(s)
        await reloadUserData()
      } catch (e) { toast.error(e.message) }
      if (on) setLoading(false)
    })()
    return () => { on = false }
  }, [id])

  const baseRow = () => ({
    user_id: user.id, tmdb_id: id,
    title: show.name, original_title: show.original_name,
    poster_path: show.poster_path, backdrop_path: show.backdrop_path,
    first_air_year: yearOf(show), total_episodes: show.number_of_episodes,
    episode_runtime: avgRuntime(show), genres: JSON.stringify(genreNames(show)),
  })

  // Aggiunge la serie in libreria (con voti esterni al primo add)
  const ensureShow = async (extra = {}) => {
    if (userShow) return userShow
    const type = guessType(show)
    const row = { ...baseRow(), status: 'da_vedere', show_type: type, ...extra }
    const saved = await upsertShow(row)
    setUserShow(saved)
    // voti esterni best-effort
    imdbShowRating(imdbId).then(r => { if (r != null) upsertShow({ user_id: user.id, tmdb_id: id, imdb_rating: r }).then(() => setUserShow(p => ({ ...p, imdb_rating: r }))) })
    if (type === 'anime') {
      malByTitle(show.name, show.original_name).then(m => {
        if (m) upsertShow({ user_id: user.id, tmdb_id: id, mal_id: m.mal_id, mal_rating: m.score }).then(() => setUserShow(p => ({ ...p, mal_id: m.mal_id, mal_rating: m.score })))
      })
    }
    return saved
  }

  const onAddClick = async () => {
    try { await ensureShow(); toast.success('Aggiunta in libreria.') }
    catch (e) { toast.error(e.message) }
  }

  const onSaveShow = async (patch) => {
    setSavingShow(true)
    try {
      const saved = await upsertShow({ ...baseRow(), ...(userShow || {}), ...patch, user_id: user.id, tmdb_id: id })
      setUserShow(saved)
      // se diventa anime e non ho ancora il voto MAL, provo a prenderlo
      if (patch.show_type === 'anime' && !saved.mal_rating) {
        malByTitle(show.name, show.original_name).then(m => {
          if (m) upsertShow({ user_id: user.id, tmdb_id: id, mal_id: m.mal_id, mal_rating: m.score }).then(() => setUserShow(p => ({ ...p, mal_id: m.mal_id, mal_rating: m.score })))
        })
      }
      toast.success('Serie aggiornata.')
      setShowSheet(false)
    } catch (e) { toast.error(e.message) }
    setSavingShow(false)
  }

  const onDelete = async () => {
    try { await deleteShow(user.id, id); toast.success('Rimossa dalla libreria.'); nav('/libreria') }
    catch (e) { toast.error(e.message) }
  }

  // --- episodi ---
  const setStatusIfNeeded = async () => {
    const cur = userShow?.status
    if (!cur || cur === 'da_vedere') {
      const saved = await upsertShow({ user_id: user.id, tmdb_id: id, ...baseRow(), ...(userShow || {}), status: 'in_corso' })
      setUserShow(saved)
    }
  }

  const toggleEpisode = async (s, e, makeWatched) => {
    try {
      await ensureShow()
      if (makeWatched) { await markEpisode(user.id, id, s, e); await setStatusIfNeeded() }
      else await unmarkEpisode(user.id, id, s, e)
      setWatchedSet(prev => { const n = new Set(prev); const k = key(s, e); makeWatched ? n.add(k) : n.delete(k); return n })
    } catch (err) { toast.error(err.message) }
  }

  const onMarkAll = async (s, epNums) => {
    try {
      await ensureShow()
      for (const e of epNums) await markEpisode(user.id, id, s, e)
      await setStatusIfNeeded()
      setWatchedSet(prev => { const n = new Set(prev); epNums.forEach(e => n.add(key(s, e))); return n })
      toast.success(`Stagione ${s} segnata.`)
    } catch (err) { toast.error(err.message) }
  }
  const onUnmarkAll = async (s, epNums) => {
    try {
      for (const e of epNums) await unmarkEpisode(user.id, id, s, e)
      setWatchedSet(prev => { const n = new Set(prev); epNums.forEach(e => n.delete(key(s, e))); return n })
    } catch (err) { toast.error(err.message) }
  }

  const onRewatch = async (s, count) => {
    try {
      const saved = await upsertSeasonTracking({ user_id: user.id, tmdb_show_id: id, season_number: s, watch_count: count })
      setTrackMap(prev => new Map(prev).set(s, saved))
    } catch (err) { toast.error(err.message) }
  }
  const onDates = async (s, patch) => {
    try {
      const existing = trackMap.get(s) || {}
      const saved = await upsertSeasonTracking({ user_id: user.id, tmdb_show_id: id, season_number: s, watch_count: existing.watch_count || 0, ...('start_date' in patch ? {} : { start_date: existing.start_date || null }), ...('end_date' in patch ? {} : { end_date: existing.end_date || null }), ...patch })
      setTrackMap(prev => new Map(prev).set(s, saved))
    } catch (err) { toast.error(err.message) }
  }

  const toggleFav = async () => {
    try {
      if (isFav) { await removeFavorite(user.id, id); setIsFav(false); setFavCount(c => c - 1) }
      else {
        if (favCount >= 6) return toast.error('Massimo 6 preferite. Rimuovine una dal profilo.')
        await ensureShow()
        await addFavorite(user.id, { tmdb_id: id, title: show.name, poster_path: show.poster_path }, favCount)
        setIsFav(true); setFavCount(c => c + 1)
      }
    } catch (e) { toast.error(e.message) }
  }

  if (loading || !show) return <div className="app-shell"><Loader /></div>

  const seasons = (show.seasons || []).filter(s => s.season_number >= 1 && s.episode_count > 0)
  const epDetailsForShow = [...detailsMap.values()]
  const rated = epDetailsForShow.filter(d => d.rating != null)
  const mediaEp = rated.length ? Math.round((rated.reduce((a, d) => a + d.rating, 0) / rated.length) * 10) / 10 : null
  const totalEpisodes = show.number_of_episodes || 0
  const watchedCount = watchedSet.size
  const pct = totalEpisodes ? Math.min(100, Math.round((watchedCount / totalEpisodes) * 100)) : 0

  const epTargetDetail = epTarget ? detailsMap.get(key(epTarget.season, epTarget.episode.episode_number)) : null
  const epTargetWatched = epTarget ? watchedSet.has(key(epTarget.season, epTarget.episode.episode_number)) : false

  return (
    <div className="show-detail">
      {/* Backdrop */}
      <div className="sd-backdrop">
        {backdropUrl(show.backdrop_path)
          ? <img src={backdropUrl(show.backdrop_path)} alt="" />
          : <div style={{ width: '100%', height: '100%', background: 'var(--surface0)' }} />}
        <div className="sd-backdrop-grad" />
        <button className="sd-back" onClick={() => nav(-1)} aria-label="Indietro">‹</button>
        <button className={'sd-fav' + (isFav ? ' on' : '')} onClick={toggleFav} aria-label="Preferito">
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isFav ? 'var(--gold)' : 'none'} stroke={isFav ? 'var(--gold)' : '#fff'} strokeWidth="2">
            <path d="M12 3l2.9 6.26 6.1.53-4.6 4.02 1.38 6.16L12 15.9 6.22 20l1.38-6.16-4.6-4.02 6.1-.53z" />
          </svg>
        </button>
      </div>

      {/* Header con poster */}
      <div className="sd-header">
        <div className="sd-poster">
          {posterUrl(show.poster_path)
            ? <img src={posterUrl(show.poster_path)} alt={show.name} />
            : <div className="sd-poster-ph">▦</div>}
        </div>
        <div className="sd-head-meta">
          <h1 className="sd-title">{show.name}</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            {yearOf(show) || '—'} · {seasons.length} stag. · {totalEpisodes} ep. {runtimeRange(show) ? '· ' + runtimeRange(show) : ''}
          </div>
          <div style={{ marginTop: 8 }}>
            <RatingBadges tmdb={show.vote_average} imdb={userShow?.imdb_rating} mal={userShow?.mal_rating} />
          </div>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 6 }}>
        {/* I tuoi voti */}
        <div className="sd-yourratings">
          <div className="yr">
            <div className="yr-label">Il tuo voto</div>
            <div className={'yr-val' + (userShow?.rating ? ' has' : '')}>{userShow?.rating ? `${userShow.rating}/10` : '—'}</div>
          </div>
          <div className="yr-div" />
          <div className="yr">
            <div className="yr-label">Media episodi</div>
            <div className={'yr-val' + (mediaEp ? ' has' : '')}>{mediaEp ? `${mediaEp}/10` : '—'}</div>
          </div>
        </div>

        {/* Generi */}
        {genreNames(show).length > 0 && (
          <div className="chip-row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            {genreNames(show).map(g => <span key={g} className="chip" style={{ pointerEvents: 'none' }}>{g}</span>)}
          </div>
        )}

        {/* Azioni */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          {userShow ? (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowSheet(true)}>✎ Modifica</button>
          ) : (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onAddClick}>+ Aggiungi</button>
          )}
        </div>
        {userShow && (
          <div style={{ marginBottom: 14 }}>
            <ConfirmInline label="Rimuovi dalla libreria" confirmLabel="Tocca ancora per rimuovere" onConfirm={onDelete} className="btn btn-danger btn-block" />
          </div>
        )}

        {/* Progresso */}
        {totalEpisodes > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span className="subtext" style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase' }}>Progresso</span>
              <span className="muted tabular" style={{ fontSize: 12 }}>{watchedCount}/{totalEpisodes} · {pct}%</span>
            </div>
            <div className="prog" style={{ height: 8 }}><i style={{ width: pct + '%' }} /></div>
          </div>
        )}

        {/* Sinossi */}
        {show.overview && <p className="sd-overview">{show.overview}</p>}

        {/* Stagioni */}
        <h2 className="section-title" style={{ marginTop: 18 }}>Stagioni</h2>
        {seasons.map(s => (
          <SeasonAccordion key={s.season_number} show={show} season={s}
            watchedSet={watchedSet} detailsMap={detailsMap} track={trackMap.get(s.season_number)}
            onToggleEpisode={toggleEpisode} onMarkAll={onMarkAll} onUnmarkAll={onUnmarkAll}
            onRewatch={onRewatch} onDates={onDates}
            onOpenEpisode={(season, episode) => setEpTarget({ season, episode })} />
        ))}

        {/* Cast */}
        {castNorm.length > 0 && (
          <>
            <h2 className="section-title" style={{ marginTop: 18 }}>Cast</h2>
            <div className="cast-strip">
              {castNorm.slice(0, 20).map((c, i) => (
                <div key={i} className="cast-cell">
                  <div className="cast-photo">
                    {c.profile_path ? <img src={profileUrl(c.profile_path)} alt="" loading="lazy" /> : <div className="cast-ph">{(c.character[0] || '?')}</div>}
                  </div>
                  <div className="cast-char">{c.character}</div>
                  <div className="cast-actor muted">{c.actor}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ShowSheet open={showSheet} onClose={() => setShowSheet(false)} initial={userShow} cast={castNorm} onSave={onSaveShow} saving={savingShow} />

      <EpisodeSheet
        open={!!epTarget} onClose={() => setEpTarget(null)}
        show={show} imdbId={imdbId}
        season={epTarget?.season} episode={epTarget?.episode}
        watched={epTargetWatched} detail={epTargetDetail}
        onSaved={reloadUserData}
      />

      <style>{`
        .show-detail { padding-bottom: 20px; }
        .sd-backdrop { position: relative; width: 100%; height: 220px; overflow: hidden; background: var(--surface0); }
        .sd-backdrop img { width: 100%; height: 100%; object-fit: cover; }
        .sd-backdrop-grad { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(30,30,46,.35) 0%, rgba(30,30,46,.2) 40%, var(--bg) 100%); }
        .sd-back, .sd-fav { position: absolute; top: 12px; width: 40px; height: 40px; display: grid; place-items: center;
          background: rgba(17,17,27,.6); backdrop-filter: blur(6px); color: #fff; }
        .sd-back { left: 12px; font-size: 30px; line-height: 1; padding-bottom: 4px; }
        .sd-fav { right: 12px; }
        .sd-header { display: flex; gap: 14px; padding: 0 14px; margin-top: -60px; position: relative; z-index: 2; align-items: flex-end; }
        .sd-poster { width: 112px; flex: 0 0 112px; aspect-ratio: 2/3; border: 3px solid var(--gold); overflow: hidden; background: var(--surface1); box-shadow: 0 10px 30px -12px rgba(0,0,0,.8); }
        .sd-poster img { width: 100%; height: 100%; object-fit: cover; }
        .sd-poster-ph { width: 100%; height: 100%; display: grid; place-items: center; color: var(--muted); font-size: 30px; }
        .sd-head-meta { flex: 1; min-width: 0; padding-bottom: 4px; }
        .sd-title { font-size: 30px; line-height: .95; letter-spacing: .02em; margin-bottom: 4px; }
        .sd-yourratings { display: flex; align-items: stretch; background: var(--surface0); border: 1px solid var(--surface1); margin-bottom: 14px; }
        .yr { flex: 1; padding: 12px; text-align: center; }
        .yr-div { width: 1px; background: var(--surface1); }
        .yr-label { font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--subtext); margin-bottom: 4px; }
        .yr-val { font-family: var(--f-display); font-size: 28px; color: var(--muted); letter-spacing: .03em; }
        .yr-val.has { color: var(--gold); }
        .sd-overview { color: var(--subtext); font-size: 14px; line-height: 1.55; margin-bottom: 4px; }
        .cast-strip { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
        .cast-strip::-webkit-scrollbar { display: none; }
        .cast-cell { flex: 0 0 78px; text-align: center; }
        .cast-photo { width: 78px; height: 78px; overflow: hidden; background: var(--surface1); }
        .cast-photo img { width: 100%; height: 100%; object-fit: cover; }
        .cast-ph { width: 100%; height: 100%; display: grid; place-items: center; font-family: var(--f-display); font-size: 26px; color: var(--muted); }
        .cast-char { font-size: 11px; font-weight: 600; margin-top: 4px; line-height: 1.15; color: var(--text);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .cast-actor { font-size: 10px; line-height: 1.1; margin-top: 2px;
          display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  )
}
