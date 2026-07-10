import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { tmdb, IMG, buildShowPayload } from '../lib/tmdb'
import { omdbRating, malLookup } from '../lib/external'
import { fmtRuntimeRange, todayISO } from '../lib/format'
import { STATUS_LABEL } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import SectionHead from '../components/SectionHead'
import ProgressBar from '../components/ProgressBar'
import FavToggle from '../components/FavToggle'
import SeasonAccordion from '../components/SeasonAccordion'
import EpisodeSheet from '../components/EpisodeSheet'
import ShowSheet from '../components/ShowSheet'

const CONFLICT_EP = 'user_id,tmdb_show_id,season_number,episode_number'

export default function ShowDetail() {
  const { id } = useParams()
  const tmdbId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [show, setShow] = useState(null)
  const [myShow, setMyShow] = useState(null)
  const [isFav, setIsFav] = useState(false)
  const [eps, setEps] = useState({})       // `${s}-${e}` → riga user_episodes
  const [det, setDet] = useState({})       // `${s}-${e}` → riga episode_details
  const [tracking, setTracking] = useState({}) // season_number → riga season_tracking
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sheetEp, setSheetEp] = useState(null)
  const [showSheetOpen, setShowSheetOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tm, ms, fav, epRows, detRows, stRows] = await Promise.all([
        tmdb.show(tmdbId),
        supabase.from('user_shows').select('*').eq('user_id', user.id).eq('tmdb_id', tmdbId).maybeSingle(),
        supabase.from('user_favorites').select('id').eq('user_id', user.id).eq('tmdb_id', tmdbId).maybeSingle(),
        supabase.from('user_episodes').select('*').eq('user_id', user.id).eq('tmdb_show_id', tmdbId).limit(3000),
        supabase.from('episode_details').select('*').eq('user_id', user.id).eq('tmdb_show_id', tmdbId).limit(3000),
        supabase.from('season_tracking').select('*').eq('user_id', user.id).eq('tmdb_show_id', tmdbId),
      ])
      for (const r of [ms, fav, epRows, detRows, stRows]) {
        if (r.error) throw new Error(r.error.message)
      }
      setShow(tm)
      setMyShow(ms.data ?? null)
      setIsFav(Boolean(fav.data))
      setEps(Object.fromEntries((epRows.data ?? []).map((r) => [`${r.season_number}-${r.episode_number}`, r])))
      setDet(Object.fromEntries((detRows.data ?? []).map((r) => [`${r.season_number}-${r.episode_number}`, r])))
      setTracking(Object.fromEntries((stRows.data ?? []).map((r) => [r.season_number, r])))
      refreshExternalRatings(tm, ms.data ?? null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId, user.id])

  useEffect(() => { load() }, [load])

  // Voti esterni: recuperati all'apertura e cachati (mai durante l'import massivo)
  async function refreshExternalRatings(tm, ms) {
    if (!ms) return
    const patch = {}
    const freshTmdb = tm.vote_average ? Math.round(tm.vote_average * 10) / 10 : null
    if (freshTmdb != null && freshTmdb !== ms.rating_tmdb) patch.rating_tmdb = freshTmdb
    if (ms.rating_imdb == null) {
      const imdbId = ms.imdb_id ?? tm.external_ids?.imdb_id
      const r = await omdbRating(imdbId)
      if (r != null) patch.rating_imdb = r
    }
    if (ms.media_type === 'anime' && ms.rating_mal == null) {
      const m = await malLookup(tm.original_name || tm.name, ms.first_air_year)
      if (m) {
        if (m.score != null) patch.rating_mal = m.score
        if (m.mal_id != null) patch.mal_id = m.mal_id
      }
    }
    if (Object.keys(patch).length) {
      const { data, error: err } = await supabase.from('user_shows')
        .update(patch).eq('id', ms.id).select().maybeSingle()
      if (!err && data) setMyShow(data)
    }
  }

  // Se la serie non è in libreria, il primo episodio la aggiunge da sé
  async function ensureShow() {
    if (myShow) return myShow
    const payload = buildShowPayload(show, user.id, { status: 'in_corso' })
    const { data, error: err } = await supabase.from('user_shows')
      .upsert(payload, { onConflict: 'user_id,tmdb_id' }).select().single()
    if (err) throw new Error(err.message)
    setMyShow(data)
    toast.info('Serie aggiunta alla libreria')
    return data
  }

  // Da vedere + primo episodio → In corso
  async function autoStatus(ms) {
    if (ms.status !== 'da_vedere') return
    const { data, error: err } = await supabase.from('user_shows')
      .update({ status: 'in_corso' }).eq('id', ms.id).select().maybeSingle()
    if (!err && data) setMyShow(data)
  }

  async function markEpisode(ep) {
    try {
      const ms = await ensureShow()
      const key = `${ep.season_number}-${ep.episode_number}`
      const base = {
        user_id: user.id, tmdb_show_id: tmdbId,
        season_number: ep.season_number, episode_number: ep.episode_number,
      }
      const { data, error: err } = await supabase.from('user_episodes')
        .upsert({ ...base, watch_count: 1 }, { onConflict: CONFLICT_EP }).select().single()
      if (err) throw new Error(err.message)
      setEps((cur) => ({ ...cur, [key]: data }))
      // Auto-data: dettaglio creato con data odierna se assente (non sovrascrive)
      const { error: e2 } = await supabase.from('episode_details')
        .upsert({ ...base, watched_date: todayISO() }, { onConflict: CONFLICT_EP, ignoreDuplicates: true })
      if (e2) throw new Error(e2.message)
      if (!det[key]) {
        setDet((cur) => ({ ...cur, [key]: { ...base, watched_date: todayISO() } }))
      }
      await autoStatus(ms)
    } catch (err) {
      toast.error(`Segna visto: ${err.message}`)
    }
  }

  async function unmarkEpisode(ep) {
    const key = `${ep.season_number}-${ep.episode_number}`
    const { error: err } = await supabase.from('user_episodes').delete().match({
      user_id: user.id, tmdb_show_id: tmdbId,
      season_number: ep.season_number, episode_number: ep.episode_number,
    })
    if (err) { toast.error(`Segna non visto: ${err.message}`); return }
    setEps((cur) => { const c = { ...cur }; delete c[key]; return c })
  }

  async function setWatchCount(ep, count) {
    if (count < 1) return
    const key = `${ep.season_number}-${ep.episode_number}`
    const payload = {
      user_id: user.id, tmdb_show_id: tmdbId,
      season_number: ep.season_number, episode_number: ep.episode_number,
      watch_count: count,
    }
    const { data, error: err } = await supabase.from('user_episodes')
      .upsert(payload, { onConflict: CONFLICT_EP }).select().single()
    if (err) { toast.error(`Volte visto: ${err.message}`); return }
    setEps((cur) => ({ ...cur, [key]: data }))
  }

  async function saveDetails(ep, fields) {
    const base = {
      user_id: user.id, tmdb_show_id: tmdbId,
      season_number: ep.season_number, episode_number: ep.episode_number,
    }
    const { data, error: err } = await supabase.from('episode_details')
      .upsert({ ...base, ...fields }, { onConflict: CONFLICT_EP }).select().single()
    if (err) { toast.error(`Salvataggio: ${err.message}`); return false }
    const key = `${ep.season_number}-${ep.episode_number}`
    setDet((cur) => ({ ...cur, [key]: data }))
    // La data modificata vale anche per le statistiche → sincronizza watched_at
    if (fields.watched_date && eps[key]) {
      const { data: e2 } = await supabase.from('user_episodes')
        .update({ watched_at: `${fields.watched_date}T12:00:00Z` })
        .eq('id', eps[key].id).select().maybeSingle()
      if (e2) setEps((cur) => ({ ...cur, [key]: e2 }))
    }
    return true
  }

  async function markAll(seasonNumber, episodes) {
    try {
      const ms = await ensureShow()
      const missing = episodes.filter((e) => !eps[`${seasonNumber}-${e.episode_number}`])
      if (!missing.length) return
      const rows = missing.map((e) => ({
        user_id: user.id, tmdb_show_id: tmdbId,
        season_number: seasonNumber, episode_number: e.episode_number, watch_count: 1,
      }))
      const { data, error: err } = await supabase.from('user_episodes')
        .upsert(rows, { onConflict: CONFLICT_EP }).select()
      if (err) throw new Error(err.message)
      const detRows = missing.map((e) => ({
        user_id: user.id, tmdb_show_id: tmdbId,
        season_number: seasonNumber, episode_number: e.episode_number, watched_date: todayISO(),
      }))
      const { error: e2 } = await supabase.from('episode_details')
        .upsert(detRows, { onConflict: CONFLICT_EP, ignoreDuplicates: true })
      if (e2) throw new Error(e2.message)
      setEps((cur) => {
        const c = { ...cur }
        for (const r of data) c[`${r.season_number}-${r.episode_number}`] = r
        return c
      })
      await autoStatus(ms)
      toast.success(`Stagione ${seasonNumber}: ${data.length} episodi segnati`)
    } catch (err) {
      toast.error(`Segna tutti: ${err.message}`)
    }
  }

  async function unmarkAll(seasonNumber) {
    const { error: err } = await supabase.from('user_episodes').delete().match({
      user_id: user.id, tmdb_show_id: tmdbId, season_number: seasonNumber,
    })
    if (err) { toast.error(`Deseleziona: ${err.message}`); return }
    setEps((cur) => Object.fromEntries(
      Object.entries(cur).filter(([k]) => !k.startsWith(`${seasonNumber}-`))
    ))
    toast.success(`Stagione ${seasonNumber} deselezionata`)
  }

  async function rewatchSeason(seasonNumber) {
    const rows = Object.values(eps)
      .filter((r) => r.season_number === seasonNumber)
      .map((r) => ({
        user_id: user.id, tmdb_show_id: tmdbId,
        season_number: r.season_number, episode_number: r.episode_number,
        watch_count: r.watch_count + 1,
      }))
    if (!rows.length) return
    const { data, error: err } = await supabase.from('user_episodes')
      .upsert(rows, { onConflict: CONFLICT_EP }).select()
    if (err) { toast.error(`Rivista +1: ${err.message}`); return }
    setEps((cur) => {
      const c = { ...cur }
      for (const r of data) c[`${r.season_number}-${r.episode_number}`] = r
      return c
    })
    toast.success(`Rivisione registrata (+1 su ${rows.length} episodi)`)
  }

  async function saveShow(fields) {
    const payload = buildShowPayload(show, user.id, fields)
    // media_type scelto dall'utente vince sul suggerimento
    const { data, error: err } = await supabase.from('user_shows')
      .upsert(payload, { onConflict: 'user_id,tmdb_id' }).select().single()
    if (err) { toast.error(`Salvataggio: ${err.message}`); return false }
    setMyShow(data)
    toast.success('Serie salvata')
    refreshExternalRatings(show, data)
    return true
  }

  async function removeShow() {
    const tables = ['user_episodes', 'episode_details', 'season_tracking']
    for (const t of tables) {
      const { error: err } = await supabase.from(t).delete()
        .match({ user_id: user.id, tmdb_show_id: tmdbId })
      if (err) { toast.error(`Rimozione (${t}): ${err.message}`); return }
    }
    const { error: err } = await supabase.from('user_shows').delete()
      .match({ user_id: user.id, tmdb_id: tmdbId })
    if (err) { toast.error(`Rimozione: ${err.message}`); return }
    setMyShow(null)
    setEps({})
    setDet({})
    setTracking({})
    setShowSheetOpen(false)
    toast.success('Serie rimossa dalla libreria')
  }

  async function saveDates(seasonNumber, patch) {
    const payload = {
      user_id: user.id, tmdb_show_id: tmdbId, season_number: seasonNumber,
      ...tracking[seasonNumber] ? { start_date: tracking[seasonNumber].start_date, end_date: tracking[seasonNumber].end_date } : {},
      ...patch,
    }
    delete payload.id
    const { data, error: err } = await supabase.from('season_tracking')
      .upsert(payload, { onConflict: 'user_id,tmdb_show_id,season_number' }).select().single()
    if (err) { toast.error(`Date stagione: ${err.message}`); return }
    setTracking((cur) => ({ ...cur, [seasonNumber]: data }))
  }

  const epAvg = useMemo(() => {
    const vals = Object.values(det).map((d) => d.rating).filter((r) => r != null)
    if (!vals.length) return null
    return Math.round((vals.reduce((s, x) => s + x, 0) / vals.length) * 10) / 10
  }, [det])

  if (loading) {
    return <div className="splash" style={{ minHeight: '60dvh' }}><span className="wordmark">MYTRACKLIST</span></div>
  }
  if (error) {
    return (
      <div className="banner banner-error mt-16">
        <span className="banner-tag">ERR</span>
        <span className="banner-msg mono">{error}</span>
      </div>
    )
  }
  if (!show) return null

  const watchedRegular = Object.values(eps).filter((r) => r.season_number > 0).length
  const seasons = (show.seasons || []).filter((s) => s.season_number > 0)
  const specials = (show.seasons || []).filter((s) => s.season_number === 0)
  const runtimeLabel = fmtRuntimeRange(show.episode_run_time?.length ? show.episode_run_time : [show.last_episode_to_air?.runtime])
  const cast = (show.aggregate_credits?.cast ?? []).slice(0, 12)

  const favShowData = {
    tmdb_id: tmdbId,
    title: show.name,
    poster_path: show.poster_path,
  }

  return (
    <>
      <div className="backdrop-hero full-bleed">
        {show.backdrop_path && <img src={IMG(show.backdrop_path, 'w780')} alt="" />}
        <button type="button" className="btn btn-sm back-btn" onClick={() => navigate(-1)}>← Indietro</button>
      </div>

      <div className="detail-head">
        <div className="detail-poster">
          {show.poster_path
            ? <img src={IMG(show.poster_path, 'w342')} alt="" />
            : <div className="poster-empty">{show.name.charAt(0)}</div>}
        </div>
        <div style={{ minWidth: 0, paddingTop: 42 }}>
          <h1 className="detail-title">{show.name}</h1>
          <p className="overline">
            {[show.first_air_date?.slice(0, 4),
              `${show.number_of_seasons} stagioni`,
              `${show.number_of_episodes} ep`,
              runtimeLabel].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <div className="ratings-row">
        {show.vote_average > 0 && <span className="chip">TMDB {show.vote_average.toFixed(1)}</span>}
        {myShow?.rating_imdb != null && <span className="chip">IMDb {myShow.rating_imdb}</span>}
        {myShow?.media_type === 'anime' && myShow?.rating_mal != null && (
          <span className="chip">MAL {myShow.rating_mal}</span>
        )}
        {myShow?.rating != null && <span className="chip chip-gold">Tuo voto {myShow.rating}/10</span>}
        {epAvg != null && <span className="chip chip-mauve">Media ep {epAvg}/10</span>}
      </div>

      <div className="detail-actions">
        <button type="button" className="btn btn-primary" style={{ flex: 1 }}
          onClick={() => setShowSheetOpen(true)}>
          {myShow ? `Modifica · ${STATUS_LABEL[myShow.status]}` : 'Aggiungi'}
        </button>
        <FavToggle show={favShowData} isFav={isFav} onChange={setIsFav} className="fav-standalone" />
      </div>

      {(() => {
        try {
          const g = show.genres?.map((x) => x.name) ?? []
          return g.length ? (
            <div className="chips mt-8">{g.map((x) => <span key={x} className="chip">{x}</span>)}</div>
          ) : null
        } catch { return null }
      })()}

      {show.overview && <p className="text-sm text-sub mt-16">{show.overview}</p>}

      {myShow && show.number_of_episodes > 0 && (
        <div className="mt-16">
          <ProgressBar value={watchedRegular} max={show.number_of_episodes} />
          <p className="mono text-sm text-sub mt-8">{watchedRegular}/{show.number_of_episodes} episodi</p>
        </div>
      )}

      <SectionHead title="STAGIONI" tag={`${seasons.length}`} />
      {[...seasons, ...specials].map((season) => (
        <SeasonAccordion
          key={season.season_number}
          showId={tmdbId}
          season={season}
          epsMap={eps}
          detMap={det}
          tracking={tracking[season.season_number]}
          onOpenEpisode={setSheetEp}
          onMark={markEpisode}
          onUnmark={unmarkEpisode}
          onMarkAll={markAll}
          onUnmarkAll={unmarkAll}
          onRewatchSeason={rewatchSeason}
          onSaveDates={saveDates}
        />
      ))}

      {cast.length > 0 && (
        <>
          <SectionHead title="CAST" />
          <div className="hstrip">
            {cast.map((p) => (
              <div key={p.id} className="cast-tile">
                {p.profile_path
                  ? <img src={IMG(p.profile_path, 'w185')} alt="" loading="lazy" />
                  : <div className="cast-noimg">?</div>}
                <div className="cast-name">{p.name}</div>
                <div className="cast-char">{p.roles?.[0]?.character}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <EpisodeSheet
        open={Boolean(sheetEp)}
        onClose={() => setSheetEp(null)}
        showId={tmdbId}
        ep={sheetEp}
        watchedRow={sheetEp ? eps[`${sheetEp.season_number}-${sheetEp.episode_number}`] : null}
        details={sheetEp ? det[`${sheetEp.season_number}-${sheetEp.episode_number}`] : null}
        onMark={markEpisode}
        onUnmark={unmarkEpisode}
        onSetWatchCount={setWatchCount}
        onSaveDetails={saveDetails}
      />

      <ShowSheet
        open={showSheetOpen}
        onClose={() => setShowSheetOpen(false)}
        show={show}
        myShow={myShow}
        onSave={saveShow}
        onRemove={removeShow}
      />
    </>
  )
}
