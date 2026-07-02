import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getShowDetails, getSeason, imgUrl, airYear } from '../lib/tmdb'

const STATUSES  = [{ v:'watching',label:'In corso'},{ v:'completed',label:'Completata'},{ v:'plan_to_watch',label:'Da vedere'},{ v:'paused',label:'In pausa'},{ v:'dropped',label:'Abbandonata'}]
const TYPES     = [{ v:'tv',label:'Serie TV'},{ v:'anime',label:'Anime'},{ v:'cartoon',label:'Cartone'}]
const PLATFORMS = ['Netflix','Prime Video','Disney+','Apple TV+','Crunchyroll','VVVVID','RaiPlay','Paramount+','TIMVision','YouTube','Chili','Pirateria','Altro']
const DEVICES   = ['TV','PC','Smartphone','Tablet']
const EMOTIONS  = [
  { e:'😍',l:'Adorato'},{ e:'❤️',l:'Amato'},{ e:'🔥',l:'Epico'},{ e:'🤯',l:'Mind-blown'},
  { e:'😂',l:'Divertente'},{ e:'😮',l:'Sorpresa'},{ e:'😢',l:'Commovente'},{ e:'💀',l:'Devastante'},
  { e:'😡',l:'Frustrante'},{ e:'😴',l:'Noioso'},{ e:'🤔',l:'Riflessivo'},{ e:'👌',l:'Solido'},
]

function Stars({ value, max=5, onChange, size=22 }) {
  const [hov, setHov] = useState(0)
  return (
    <div className="stars">
      {Array.from({length:max},(_,i)=>i+1).map(n => (
        <button key={n} className={`star${(hov||value)>=n?' on':''}`} style={{ fontSize:size }}
          onMouseEnter={()=>setHov(n)} onMouseLeave={()=>setHov(0)}
          onClick={()=>onChange(n===value?null:n)}>★</button>
      ))}
    </div>
  )
}

// ── Episode sheet ─────────────────────────────────────────────────────────────
function EpSheet({ ep, showId, userId, detail, isWatched, onSave, onClose }) {
  const [watched,   setWatched]   = useState(isWatched)
  const [rating,    setRating]    = useState(detail?.rating||null)
  const [emotions,  setEmotions]  = useState(()=> { try { return JSON.parse(detail?.emotions||'[]') } catch { return [] } })
  const [character, setChar]      = useState(detail?.fav_character||'')
  const [platform,  setPlat]      = useState(detail?.platform||null)
  const [device,    setDevice]    = useState(detail?.device||null)
  const [wcount,    setWcount]    = useState(detail?.watch_count||1)
  const [note,      setNote]      = useState(detail?.note||'')
  const [date,      setDate]      = useState(detail?.watched_date||new Date().toISOString().slice(0,10))
  const [saving,    setSaving]    = useState(false)

  const toggleEmo = e => setEmotions(p => p.includes(e) ? p.filter(x=>x!==e) : [...p, e])

  const save = async () => {
    setSaving(true)
    await onSave({ watched, season_number:ep.season_number, episode_number:ep.episode_number,
      rating:rating||null, emotions:JSON.stringify(emotions),
      fav_character:character||null, platform:platform||null, device:device||null,
      watch_count:wcount, note:note||null, watched_date:watched?date:null })
    setSaving(false); onClose()
  }

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-title" style={{ fontSize:'1.2rem' }}>
          {ep.season_number}×{String(ep.episode_number).padStart(2,'0')} — {ep.name||`Ep. ${ep.episode_number}`}
        </div>

        {ep.vote_average > 0 && (
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:12 }}>
            TMDB: ⭐ {ep.vote_average?.toFixed(1)}/10
            {ep.runtime && ` · ${ep.runtime}min`}
          </div>
        )}
        {ep.overview && <p style={{ fontSize:12, color:'var(--dim)', marginBottom:14, lineHeight:1.5 }}>{ep.overview}</p>}

        {/* Toggle watched */}
        <div className="sheet-row">
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
            <div onClick={()=>setWatched(w=>!w)} style={{ width:42,height:22,borderRadius:0,background:watched?'var(--accent)':'var(--surface1)',position:'relative',transition:'background .2s',cursor:'pointer',flexShrink:0 }}>
              <div style={{ position:'absolute',top:3,left:watched?22:3,width:16,height:16,background:'white',transition:'left .2s' }} />
            </div>
            <span style={{ fontSize:14 }}>{watched?'Visto ✓':'Non visto'}</span>
          </label>
        </div>

        {watched && <>
          <div className="sheet-row">
            <div className="label">Data visione</div>
            <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div className="sheet-row">
            <div className="label">Voto (1–5 ★)</div>
            <Stars value={rating} max={5} onChange={setRating} size={26} />
          </div>
          <div className="sheet-row">
            <div className="label">Emozioni (scelta multipla)</div>
            <div className="emotions-wrap">
              {EMOTIONS.map(({e,l}) => (
                <button key={e} className={`emo-btn${emotions.includes(e)?' on':''}`} onClick={()=>toggleEmo(e)}>
                  {e}<span>{l}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="sheet-row">
            <div className="label">Personaggio preferito</div>
            <input className="input" placeholder="Es. Spike Spiegel" value={character} onChange={e=>setChar(e.target.value)} />
          </div>
          <div className="sheet-row">
            <div className="label">Piattaforma</div>
            <div className="plat-wrap">
              {PLATFORMS.map(p => <button key={p} className={`plat-chip${platform===p?' on':''}`} onClick={()=>setPlat(platform===p?null:p)}>{p}</button>)}
            </div>
          </div>
          <div className="sheet-row">
            <div className="label">Dispositivo</div>
            <div className="plat-wrap">
              {DEVICES.map(d => <button key={d} className={`plat-chip${device===d?' on':''}`} onClick={()=>setDevice(device===d?null:d)}>{d}</button>)}
            </div>
          </div>
          <div className="sheet-row">
            <div className="label">Volte visto</div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setWcount(c=>Math.max(1,c-1))}>−</button>
              <span style={{ fontWeight:600, fontSize:16, minWidth:20, textAlign:'center' }}>{wcount}</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setWcount(c=>c+1)}>+</button>
            </div>
          </div>
          <div className="sheet-row">
            <div className="label">Note episodio</div>
            <textarea className="input textarea" placeholder="Pensieri..." value={note} onChange={e=>setNote(e.target.value)} />
          </div>
        </>}

        <div className="sheet-actions">
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'...':'Salva'}</button>
          <button className="btn btn-ghost" onClick={onClose}>Annulla</button>
        </div>
      </div>
    </div>
  )
}

// ── Season block ──────────────────────────────────────────────────────────────
function SeasonBlock({ showId, season, watchedSet, detailsMap, onToggle, onEpClick, seasonTracking, onSeasonTrack }) {
  const [open,  setOpen]  = useState(false)
  const [eps,   setEps]   = useState(null)
  const [loadE, setLoadE] = useState(false)

  const toggle = async () => {
    if (!open && !eps) {
      setLoadE(true)
      try { const d = await getSeason(showId, season.season_number); setEps(d.episodes||[]) } catch { setEps([]) }
      setLoadE(false)
    }
    setOpen(o=>!o)
  }

  const realEps   = eps?.filter(e=>e.episode_number>0)??[]
  const watchedN  = realEps.filter(e=>watchedSet.has(`${season.season_number}-${e.episode_number}`)).length
  const st        = seasonTracking[season.season_number]

  return (
    <div className="season-block">
      <div className="season-hd" onClick={toggle}>
        <span style={{ fontFamily:'Bebas Neue', fontSize:'1.1rem' }}>{season.name||`Stagione ${season.season_number}`}</span>
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          {st?.watch_count > 1 && <span style={{ fontSize:11, color:'var(--mauve)' }}>×{st.watch_count}</span>}
          <span style={{ fontSize:11, color:'var(--muted)' }}>{watchedN}/{season.episode_count}</span>
          <span style={{ color:'var(--muted)' }}>{open?'▲':'▼'}</span>
        </span>
      </div>

      {open && (
        <div className="ep-list">
          {loadE
            ? <div style={{ padding:16, textAlign:'center' }}><div className="spinner" style={{ margin:'0 auto', width:22, height:22 }} /></div>
            : <>
                {/* Season date tracking */}
                <div style={{ padding:'8px 14px', borderTop:'1px solid var(--surface0)', background:'var(--mantle)', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, color:'var(--muted)' }}>Stagione:</span>
                  <input type="date" className="input" style={{ flex:1, minWidth:120, padding:'4px 8px', fontSize:12 }}
                    value={st?.start_date||''} placeholder="Inizio"
                    onChange={e=>onSeasonTrack(season.season_number,'start_date',e.target.value)} />
                  <input type="date" className="input" style={{ flex:1, minWidth:120, padding:'4px 8px', fontSize:12 }}
                    value={st?.end_date||''} placeholder="Fine"
                    onChange={e=>onSeasonTrack(season.season_number,'end_date',e.target.value)} />
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:11, color:'var(--muted)' }}>×</span>
                    <button className="btn btn-ghost btn-sm" onClick={()=>onSeasonTrack(season.season_number,'watch_count',(st?.watch_count||1)-1)}>−</button>
                    <span style={{ fontSize:13, fontWeight:600 }}>{st?.watch_count||1}</span>
                    <button className="btn btn-ghost btn-sm" onClick={()=>onSeasonTrack(season.season_number,'watch_count',(st?.watch_count||1)+1)}>+</button>
                  </div>
                </div>

                {realEps.map(ep => {
                  const key    = `${season.season_number}-${ep.episode_number}`
                  const done   = watchedSet.has(key)
                  const detail = detailsMap[key]
                  const emos   = (() => { try { return JSON.parse(detail?.emotions||'[]') } catch { return [] } })()
                  return (
                    <div key={ep.id} className={`ep-row${done?' watched':''}`}
                      onClick={()=>onEpClick({...ep, season_number:season.season_number, watched:done})}>
                      <button className={`ep-check${done?' done':''}`} tabIndex={-1}
                        onClick={e=>{e.stopPropagation();onToggle(season.season_number,ep.episode_number,!done)}}>
                        {done?'✓':''}
                      </button>
                      <span className="ep-num">{ep.episode_number}</span>
                      <span className="ep-name">{ep.name||`Ep. ${ep.episode_number}`}</span>
                      <span className="ep-badges">
                        {emos.slice(0,2).map(e=><span key={e} style={{ fontSize:14 }}>{e}</span>)}
                        {detail?.rating && <span style={{ fontSize:11, color:'var(--gold)' }}>{'★'.repeat(detail.rating)}</span>}
                        {ep.vote_average>0 && <span style={{ fontSize:10, color:'var(--muted)' }}>{ep.vote_average?.toFixed(1)}</span>}
                        {ep.runtime && <span style={{ fontSize:10, color:'var(--muted)' }}>{ep.runtime}m</span>}
                      </span>
                    </div>
                  )
                })}
                <div className="season-actions">
                  <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={()=>realEps.forEach(e=>onToggle(season.season_number,e.episode_number,true))}>✓ Tutti</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={()=>realEps.forEach(e=>onToggle(season.season_number,e.episode_number,false))}>✗ Nessuno</button>
                </div>
              </>
          }
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

  const [show,       setShow]       = useState(null)
  const [userShow,   setUserShow]   = useState(null)
  const [watchedSet, setWatchedSet] = useState(new Set())
  const [detailsMap, setDetailsMap] = useState({})
  const [seaTracks,  setSeaTracks]  = useState({})
  const [loading,    setLoading]    = useState(true)
  const [sheet,      setSheet]      = useState(false)
  const [epSheet,    setEpSheet]    = useState(null)
  const [isFav,      setIsFav]      = useState(false)

  // Edit state
  const [status,   setStatus]   = useState('plan_to_watch')
  const [mtype,    setMtype]    = useState('tv')
  const [rating,   setRating]   = useState(null)
  const [note,     setNote]     = useState('')
  const [favChar,  setFavChar]  = useState('')
  const [platform, setPlat]     = useState(null)
  const [device,   setDevice]   = useState(null)
  const [wcount,   setWcount]   = useState(1)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { load() }, [id])

  const load = async () => {
    setLoading(true)
    const [tmdb, { data:us }, { data:eps }, { data:dets }, { data:sea }, { data:fav }] = await Promise.all([
      getShowDetails(tmdbId),
      supabase.from('user_shows').select('*').eq('user_id',user.id).eq('tmdb_id',tmdbId).maybeSingle(),
      supabase.from('user_episodes').select('season_number,episode_number').eq('user_id',user.id).eq('tmdb_show_id',tmdbId),
      supabase.from('episode_details').select('*').eq('user_id',user.id).eq('tmdb_show_id',tmdbId),
      supabase.from('season_tracking').select('*').eq('user_id',user.id).eq('tmdb_show_id',tmdbId),
      supabase.from('user_favorites').select('id').eq('user_id',user.id).eq('tmdb_id',tmdbId).maybeSingle(),
    ])
    setShow(tmdb)
    setUserShow(us)
    setIsFav(!!fav)
    if (us) { setStatus(us.status); setMtype(us.media_type); setRating(us.rating); setNote(us.note||''); setFavChar(us.fav_character||''); setPlat(us.main_platform||null); setDevice(us.main_device||null); setWcount(us.watch_count||1) }
    if (eps) setWatchedSet(new Set(eps.map(e=>`${e.season_number}-${e.episode_number}`)))
    if (dets) { const m={}; dets.forEach(d=>{ m[`${d.season_number}-${d.episode_number}`]=d }); setDetailsMap(m) }
    if (sea) { const m={}; sea.forEach(s=>{ m[s.season_number]=s }); setSeaTracks(m) }
    setLoading(false)
  }

  const handleToggle = useCallback(async (sn, en, watched) => {
    const key = `${sn}-${en}`
    setWatchedSet(p => { const n=new Set(p); watched?n.add(key):n.delete(key); return n })
    if (watched) await supabase.from('user_episodes').upsert({ user_id:user.id, tmdb_show_id:tmdbId, season_number:sn, episode_number:en, watched_at:new Date().toISOString() },{ onConflict:'user_id,tmdb_show_id,season_number,episode_number' })
    else await supabase.from('user_episodes').delete().eq('user_id',user.id).eq('tmdb_show_id',tmdbId).eq('season_number',sn).eq('episode_number',en)
  }, [tmdbId, user.id])

  const handleSaveEp = useCallback(async ({ watched, season_number:sn, episode_number:en, ...det }) => {
    const key = `${sn}-${en}`
    const isW = watchedSet.has(key)
    if (watched !== isW) await handleToggle(sn, en, watched)
    await supabase.from('episode_details').upsert({ user_id:user.id, tmdb_show_id:tmdbId, season_number:sn, episode_number:en, ...det, updated_at:new Date().toISOString() },{ onConflict:'user_id,tmdb_show_id,season_number,episode_number' })
    setDetailsMap(p => ({ ...p, [key]:{ ...p[key], ...det } }))
  }, [tmdbId, user.id, watchedSet, handleToggle])

  const handleSeaTrack = useCallback(async (sn, field, val) => {
    const existing = seaTracks[sn]||{}
    const updated  = { ...existing, [field]: field==='watch_count' ? Math.max(1,val) : val }
    setSeaTracks(p => ({ ...p, [sn]:updated }))
    await supabase.from('season_tracking').upsert({ user_id:user.id, tmdb_show_id:tmdbId, season_number:sn, ...updated },{ onConflict:'user_id,tmdb_show_id,season_number' })
  }, [tmdbId, user.id, seaTracks])

  const saveShow = async () => {
    setSaving(true)
    const seasons  = show?.seasons?.filter(s=>s.season_number>0)||[]
    const totalEps = seasons.reduce((a,s)=>a+(s.episode_count||0),0)
    const genreStr = JSON.stringify(show?.genres?.map(g=>g.name)||[])
    const payload  = {
      user_id:user.id, tmdb_id:tmdbId, media_type:mtype, status,
      rating:rating||null, note:note||null, fav_character:favChar||null,
      main_platform:platform||null, main_device:device||null, watch_count:wcount,
      title:show?.name||'', original_title:show?.original_name||'',
      poster_path:show?.poster_path||null, backdrop_path:show?.backdrop_path||null,
      first_air_year:airYear(show?.first_air_date),
      total_episodes:totalEps, episode_runtime:show?.episode_run_time?.[0]||25,
      genres:genreStr, updated_at:new Date().toISOString(),
    }
    const { data, error } = await supabase.from('user_shows').upsert(payload,{ onConflict:'user_id,tmdb_id' }).select().single()
    if (!error) setUserShow(data)
    setSheet(false); setSaving(false)
  }

  const removeShow = async () => {
    if (!confirm('Rimuovere dalla libreria?')) return
    await Promise.all([
      supabase.from('user_shows').delete().eq('user_id',user.id).eq('tmdb_id',tmdbId),
      supabase.from('user_episodes').delete().eq('user_id',user.id).eq('tmdb_show_id',tmdbId),
    ])
    setUserShow(null); setWatchedSet(new Set()); setSheet(false)
  }

  const toggleFav = async () => {
    if (isFav) {
      await supabase.from('user_favorites').delete().eq('user_id',user.id).eq('tmdb_id',tmdbId)
      setIsFav(false)
    } else {
      await supabase.from('user_favorites').upsert({ user_id:user.id, tmdb_id:tmdbId, title:show?.name||'', poster_path:show?.poster_path||null },{ onConflict:'user_id,tmdb_id' })
      setIsFav(true)
    }
  }

  // Avg ep rating ×2
  const epRatings = Object.values(detailsMap).map(d=>d.rating).filter(Boolean)
  const avgScore  = epRatings.length ? (epRatings.reduce((a,b)=>a+b,0)/epRatings.length*2).toFixed(1) : null

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!show)   return <div className="page"><p>Errore.</p></div>

  const backdrop = imgUrl(show.backdrop_path,'w780')
  const poster   = imgUrl(show.poster_path,'w342')
  const seasons  = show.seasons?.filter(s=>s.season_number>0)||[]
  const totalEps = seasons.reduce((a,s)=>a+(s.episode_count||0),0)
  const runtimeStr = show.episode_run_time?.length
    ? (show.episode_run_time.length===1 ? `~${show.episode_run_time[0]}min` : `~${Math.min(...show.episode_run_time)}–${Math.max(...show.episode_run_time)}min`)
    : null

  return (
    <div className="page" style={{ paddingTop:0 }}>
      {backdrop && <div className="backdrop" style={{ height:220 }}><img src={backdrop} alt="" /></div>}

      <div style={{ marginTop:backdrop?-44:16 }}>
        <div className="detail-header">
          {poster && <img src={poster} alt={show.name} className="detail-poster" style={{ height:135 }} />}
          <div style={{ flex:1, minWidth:0 }}>
            <h1 className="detail-title">{show.name}</h1>
            <div className="detail-meta">
              {airYear(show.first_air_date)}{show.number_of_seasons&&` · ${show.number_of_seasons} stag.`}{totalEps>0&&` · ${totalEps} ep`}{runtimeStr&&` · ${runtimeStr}`}
            </div>
            {show.vote_average>0 && (
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>
                TMDB ⭐ {show.vote_average?.toFixed(1)} ({show.vote_count?.toLocaleString()} voti)
              </div>
            )}
            {avgScore && (
              <div style={{ fontSize:12, color:'var(--gold)', marginTop:2 }}>
                Media ep. ★{avgScore}/10
              </div>
            )}
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:6 }}>
              {show.genres?.map(g=><span key={g.id} className="badge" style={{ background:'var(--surface1)', color:'var(--dim)' }}>{g.name}</span>)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={()=>setSheet(true)}>
            {userShow?'✎ Modifica':'+ Aggiungi'}
          </button>
          <button
            onClick={toggleFav}
            style={{ background:isFav?'var(--gold-dim)':'var(--surface0)', border:`1px solid ${isFav?'var(--gold)':'var(--surface1)'}`, color:isFav?'var(--gold)':'var(--muted)', padding:'9px 14px', fontSize:18, cursor:'pointer' }}
            title={isFav?'Rimuovi dai preferiti':'Aggiungi ai preferiti'}
          >★</button>
        </div>

        {show.overview && <p style={{ fontSize:13, color:'var(--dim)', lineHeight:1.6, marginBottom:14 }}>{show.overview}</p>}
        {show.overview && <div className="divider" />}

        {/* Progress */}
        {userShow && totalEps>0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--muted)', marginBottom:4 }}>
              <span>Progresso</span><span>{watchedSet.size}/{totalEps} ({Math.round(watchedSet.size/totalEps*100)}%)</span>
            </div>
            <div className="progress-bar" style={{ height:4 }}>
              <div className="progress-fill" style={{ width:`${watchedSet.size/totalEps*100}%` }} />
            </div>
          </div>
        )}

        {/* Seasons */}
        {seasons.length>0 && (
          <>
            <div className="label" style={{ marginBottom:8 }}>Stagioni</div>
            {seasons.map(s => (
              <SeasonBlock key={s.id} showId={tmdbId} season={s}
                watchedSet={watchedSet} detailsMap={detailsMap}
                onToggle={handleToggle} onEpClick={ep=>setEpSheet({ep, detail:detailsMap[`${ep.season_number}-${ep.episode_number}`]})}
                seasonTracking={seaTracks} onSeasonTrack={handleSeaTrack}
              />
            ))}
          </>
        )}

        {/* Cast */}
        {show.credits?.cast?.length>0 && (
          <div style={{ marginTop:14 }}>
            <div className="label" style={{ marginBottom:8 }}>Cast principale</div>
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
              {show.credits.cast.slice(0,10).map(c=>(
                <div key={c.id} style={{ flexShrink:0, width:64, textAlign:'center' }}>
                  <div style={{ width:64, height:64, background:'var(--surface0)', border:'1px solid var(--surface1)', overflow:'hidden', marginBottom:4, borderRadius:0 }}>
                    {c.profile_path && <img src={imgUrl(c.profile_path,'w185')} alt={c.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />}
                  </div>
                  <div style={{ fontSize:9, color:'var(--dim)', lineHeight:1.3 }}>{c.name}</div>
                  <div style={{ fontSize:9, color:'var(--muted)', lineHeight:1.3 }}>{c.character}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Show edit sheet */}
      {sheet && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setSheet(false)}>
          <div className="sheet">
            <h2 className="sheet-title">{show.name}</h2>

            <div className="sheet-row">
              <div className="label">Stato</div>
              <select className="select" value={status} onChange={e=>setStatus(e.target.value)}>
                {STATUSES.map(o=><option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </div>
            <div className="sheet-row">
              <div className="label">Tipo</div>
              <div style={{ display:'flex', gap:6 }}>
                {TYPES.map(o=><button key={o.v} className={`chip${mtype===o.v?' active':''}`} onClick={()=>setMtype(o.v)}>{o.label}</button>)}
              </div>
            </div>
            <div className="sheet-row">
              <div className="label">Voto serie (1–10 ★)</div>
              <Stars value={rating} max={10} onChange={setRating} size={20} />
            </div>
            <div className="sheet-row">
              <div className="label">Personaggio preferito</div>
              <input className="input" placeholder="Es. L Lawliet" value={favChar} onChange={e=>setFavChar(e.target.value)} />
            </div>
            <div className="sheet-row">
              <div className="label">Piattaforma principale</div>
              <div className="plat-wrap">
                {PLATFORMS.map(p=><button key={p} className={`plat-chip${platform===p?' on':''}`} onClick={()=>setPlat(platform===p?null:p)}>{p}</button>)}
              </div>
            </div>
            <div className="sheet-row">
              <div className="label">Dispositivo principale</div>
              <div className="plat-wrap">
                {DEVICES.map(d=><button key={d} className={`plat-chip${device===d?' on':''}`} onClick={()=>setDevice(device===d?null:d)}>{d}</button>)}
              </div>
            </div>
            <div className="sheet-row">
              <div className="label">Volte vista</div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <button className="btn btn-ghost btn-sm" onClick={()=>setWcount(c=>Math.max(1,c-1))}>−</button>
                <span style={{ fontWeight:600, fontSize:16 }}>{wcount}</span>
                <button className="btn btn-ghost btn-sm" onClick={()=>setWcount(c=>c+1)}>+</button>
              </div>
            </div>
            <div className="sheet-row">
              <div className="label">Note</div>
              <textarea className="input textarea" placeholder="Pensieri sulla serie..." value={note} onChange={e=>setNote(e.target.value)} />
            </div>

            <div className="sheet-actions">
              <button className="btn btn-primary" onClick={saveShow} disabled={saving}>{saving?'...':'Salva'}</button>
              {userShow && <button className="btn btn-danger" onClick={removeShow}>Rimuovi</button>}
            </div>
          </div>
        </div>
      )}

      {/* Episode sheet */}
      {epSheet && (
        <EpSheet
          ep={epSheet.ep} showId={tmdbId} userId={user.id}
          detail={epSheet.detail} isWatched={watchedSet.has(`${epSheet.ep.season_number}-${epSheet.ep.episode_number}`)}
          onSave={handleSaveEp} onClose={()=>setEpSheet(null)}
        />
      )}
    </div>
  )
}
