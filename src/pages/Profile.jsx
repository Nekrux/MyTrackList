import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { imgUrl } from '../lib/tmdb'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const TABS = ['Profilo','Statistiche','Modifica']

const PIE_COLORS = ['#cba6f7','#a6e3a1','#f38ba8','#89b4fa','#f9e2af']

export default function Profile() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()

  const [tab,       setTab]       = useState('Profilo')
  const [profile,   setProfile]   = useState(null)
  const [favorites, setFavorites] = useState([])
  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [copied,    setCopied]    = useState(false)
  const [editFavs,  setEditFavs]  = useState(false)
  const [myShows,   setMyShows]   = useState([])
  const [favSearch, setFavSearch] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')

  // Edit form
  const [username,    setUsername]    = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio,         setBio]         = useState('')
  const [note,        setNote]        = useState('')
  const [avatarUrl,   setAvatarUrl]   = useState('')
  const [bannerUrl,   setBannerUrl]   = useState('')
  const [isPublic,    setIsPublic]    = useState(true)
  const [tvtimeUrl,   setTvtimeUrl]   = useState('')
  const [malUrl,      setMalUrl]      = useState('')
  const [imdbUrl,     setImdbUrl]     = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [{ data:prof }, { data:favs }, { data:shows }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id',user.id).maybeSingle(),
      supabase.from('user_favorites').select('*').eq('user_id',user.id).order('position'),
      supabase.from('user_shows').select('*').eq('user_id',user.id),
    ])
    setProfile(prof); setFavorites(favs||[]); setMyShows(shows||[])
    if (prof) {
      setUsername(prof.username||''); setDisplayName(prof.display_name||'')
      setBio(prof.bio||''); setNote(prof.note||'')
      setAvatarUrl(prof.avatar_url||''); setBannerUrl(prof.banner_url||'')
      setIsPublic(prof.is_public!==false)
      setTvtimeUrl(prof.social_tvtime||''); setMalUrl(prof.social_mal||''); setImdbUrl(prof.social_imdb||'')
    }
    if (shows?.length) await buildStats(shows)
    setLoading(false)
  }

  const buildStats = async (shows) => {
    const [{ data:eps }, { data:dets }] = await Promise.all([
      supabase.from('user_episodes').select('tmdb_show_id,watched_at').eq('user_id',user.id),
      supabase.from('episode_details').select('rating,emotions,platform,device').eq('user_id',user.id),
    ])
    const showMap  = Object.fromEntries(shows.map(s=>[s.tmdb_id, s.episode_runtime||25]))
    const totalMin = (eps||[]).reduce((a,e)=>a+(showMap[e.tmdb_show_id]||25),0)
    const byStatus = shows.reduce((a,s)=>{ a[s.status]=(a[s.status]||0)+1; return a },{})
    const byType   = shows.reduce((a,s)=>{ a[s.media_type]=(a[s.media_type]||0)+1; return a },{})
    const now = new Date()
    const thisMonth = (eps||[]).filter(e=>{ const d=new Date(e.watched_at); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear() }).length
    const ratings = (dets||[]).map(d=>d.rating).filter(Boolean)
    const avgRating = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1) : null

    // Rating distribution for bar chart (1-5 stars)
    const ratingDist = [1,2,3,4,5].map(n=>({ name:`${n}★`, value:(dets||[]).filter(d=>d.rating===n).length }))

    // Pie data by type
    const typePie = Object.entries(byType).map(([k,v])=>({ name:{tv:'Serie TV',anime:'Anime',cartoon:'Cartoni'}[k]||k, value:v }))

    // Top platforms
    const platCount = {}; (dets||[]).forEach(d=>{ if(d.platform){ platCount[d.platform]=(platCount[d.platform]||0)+1 } })
    const topPlats  = Object.entries(platCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>({ name:k, value:v }))

    const topRated = [...shows].filter(s=>s.rating).sort((a,b)=>b.rating-a.rating).slice(0,5)

    setStats({ totalMin, totalHours:Math.round(totalMin/60), totalDays:Math.round(totalMin/60/24), total:shows.length, byStatus, byType, thisMonth, avgRating, ratingDist, typePie, topPlats, topRated })
  }

  const saveProfile = async () => {
    setSaving(true); setSaveMsg('')
    const { error } = await supabase.from('user_profiles').upsert({
      id:user.id,
      username:username.toLowerCase().replace(/[^a-z0-9_]/g,''),
      display_name:displayName||null, bio:bio.slice(0,300)||null, note:note.slice(0,500)||null,
      avatar_url:avatarUrl||null, banner_url:bannerUrl||null,
      is_public:isPublic, social_tvtime:tvtimeUrl||null, social_mal:malUrl||null, social_imdb:imdbUrl||null,
      updated_at:new Date().toISOString(),
    },{ onConflict:'id' })
    if (error) setSaveMsg('Errore: '+error.message)
    else { setSaveMsg('Salvato!'); await loadAll(); setTab('Profilo') }
    setSaving(false)
  }

  const addFav = async show => {
    if (favorites.length>=6||favorites.find(f=>f.tmdb_id===show.tmdb_id)) return
    const { data } = await supabase.from('user_favorites').insert({ user_id:user.id, tmdb_id:show.tmdb_id, title:show.title, poster_path:show.poster_path, position:favorites.length }).select().single()
    if (data) setFavorites(p=>[...p,data])
  }
  const rmFav = async id => {
    await supabase.from('user_favorites').delete().eq('user_id',user.id).eq('tmdb_id',id)
    setFavorites(p=>p.filter(f=>f.tmdb_id!==id))
  }

  const copyLink = () => {
    if (!profile?.username) return
    navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}`)
    setCopied(true); setTimeout(()=>setCopied(false),2000)
  }

  const filtered = myShows.filter(s=>s.title.toLowerCase().includes(favSearch.toLowerCase()))

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page" style={{ paddingTop:0 }}>
      {/* Banner */}
      <div className="profile-banner" style={{ height:180 }}>
        {(profile?.banner_url) && <img src={profile.banner_url} alt="" />}
      </div>

      {/* Header */}
      <div className="profile-hd">
        <div className="profile-avatar">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" />
            : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontSize:28 }}>👤</div>
          }
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="profile-name">{profile?.display_name||profile?.username||'Il tuo profilo'}</div>
          {profile?.username && <div className="profile-username">@{profile.username}</div>}
          {profile?.bio && <div className="profile-bio">{profile.bio}</div>}
          {/* Social links */}
          {(profile?.social_tvtime||profile?.social_mal||profile?.social_imdb) && (
            <div className="social-links" style={{ marginTop:6 }}>
              {profile.social_tvtime && <a href={profile.social_tvtime} target="_blank" rel="noopener" className="social-link">TVTime</a>}
              {profile.social_imdb   && <a href={profile.social_imdb}   target="_blank" rel="noopener" className="social-link">IMDb</a>}
              {profile.social_mal    && <a href={profile.social_mal}    target="_blank" rel="noopener" className="social-link">MAL</a>}
            </div>
          )}
        </div>
      </div>

      {/* Public link */}
      {profile?.username && profile?.is_public && (
        <div className="share-box">
          <span>{window.location.origin}/u/{profile.username}</span>
          <button onClick={copyLink} style={{ background:'none',color:copied?'var(--green)':'var(--accent)',fontSize:12,flexShrink:0 }}>
            {copied?'✓ Copiato':'Copia'}
          </button>
        </div>
      )}

      {/* Note */}
      {profile?.note && (
        <div style={{ background:'var(--surface0)', border:'1px solid var(--surface1)', padding:'10px 12px', fontSize:13, color:'var(--subtext)', lineHeight:1.5, marginBottom:14 }}>
          {profile.note}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t=><button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>{t}</button>)}
        <button className="tab" onClick={()=>nav('/import')}>Import TVTime</button>
      </div>

      {/* ── PROFILO TAB ── */}
      {tab==='Profilo' && (
        <>
          <div className="section-hd">
            <h3 className="section-title">Serie preferite</h3>
            <button onClick={()=>setEditFavs(p=>!p)} style={{ background:'none',color:'var(--accent)',fontSize:12 }}>{editFavs?'Fine':'✎ Modifica'}</button>
          </div>

          <div className="favorites-grid">
            {Array.from({length:6},(_,i)=>{
              const fav = favorites[i]
              return fav ? (
                <div key={fav.tmdb_id} className="fav-card" onClick={()=>!editFavs&&nav(`/show/${fav.tmdb_id}`)}>
                  {fav.poster_path ? <img src={imgUrl(fav.poster_path,'w185')} alt={fav.title} loading="lazy" /> : <div className="fav-card-empty">{fav.title[0]}</div>}
                  <div className="trending-card-title" style={{ fontSize:10 }}>{fav.title}</div>
                  {editFavs && <button className="fav-card-rm" onClick={e=>{e.stopPropagation();rmFav(fav.tmdb_id)}}>✕</button>}
                </div>
              ) : (
                <div key={i} className="fav-card">
                  <div className="fav-card-empty" style={{ color:'var(--surface1)',fontSize:editFavs?22:16 }}>{editFavs?'+':'—'}</div>
                </div>
              )
            })}
          </div>

          {editFavs && (
            <div style={{ marginBottom:20 }}>
              <div className="label" style={{ marginBottom:6 }}>Cerca nelle tue serie</div>
              <input className="input" placeholder="Cerca..." value={favSearch} onChange={e=>setFavSearch(e.target.value)} style={{ marginBottom:8 }} />
              <div style={{ display:'flex',flexDirection:'column',gap:6,maxHeight:280,overflowY:'auto' }}>
                {filtered.slice(0,12).map(s=>(
                  <button key={s.tmdb_id} className="show-card"
                    style={{ opacity:favorites.find(f=>f.tmdb_id===s.tmdb_id)?.id?0.4:1 }}
                    onClick={()=>addFav(s)}>
                    <div className="show-card-poster">
                      {s.poster_path?<img src={imgUrl(s.poster_path,'w185')} alt={s.title} />:<span>—</span>}
                    </div>
                    <div className="show-card-info">
                      <div className="show-card-title">{s.title}</div>
                      <div className="show-card-meta">{s.first_air_year}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={()=>setTab('Modifica')}>✎ Modifica profilo</button>
            <button className="btn btn-ghost btn-sm" onClick={signOut} style={{ color:'var(--red)',borderColor:'var(--red)' }}>Esci</button>
          </div>
        </>
      )}

      {/* ── STATISTICHE TAB ── */}
      {tab==='Statistiche' && stats && (
        <>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-val">{stats.totalHours.toLocaleString()}</div><div className="stat-label">Ore guardate</div></div>
            <div className="stat-card"><div className="stat-val">{stats.totalDays}</div><div className="stat-label">Giorni di visione</div></div>
            <div className="stat-card"><div className="stat-val">{stats.total}</div><div className="stat-label">Serie totali</div></div>
            <div className="stat-card"><div className="stat-val">{stats.thisMonth}</div><div className="stat-label">Ep. questo mese</div></div>
          </div>
          {stats.avgRating && (
            <div className="stat-card" style={{ marginBottom:16 }}>
              <div className="stat-val">{(parseFloat(stats.avgRating)*2).toFixed(1)}<span style={{ fontSize:'1rem',color:'var(--muted)' }}>/10</span></div>
              <div className="stat-label">Voto medio episodi</div>
            </div>
          )}

          {/* Pie chart types */}
          {stats.typePie?.length>0 && (
            <div style={{ marginBottom:20 }}>
              <div className="label" style={{ marginBottom:8 }}>Per tipologia</div>
              <div style={{ display:'flex',alignItems:'center',gap:16 }}>
                <ResponsiveContainer width="50%" height={140}>
                  <PieChart>
                    <Pie data={stats.typePie} dataKey="value" cx="50%" cy="50%" outerRadius={60}>
                      {stats.typePie.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                  {stats.typePie.map((d,i)=>(
                    <div key={d.name} style={{ display:'flex',alignItems:'center',gap:6,fontSize:13 }}>
                      <div style={{ width:10,height:10,background:PIE_COLORS[i%PIE_COLORS.length],flexShrink:0 }} />
                      <span>{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bar chart ratings */}
          {stats.ratingDist?.some(d=>d.value>0) && (
            <div style={{ marginBottom:20 }}>
              <div className="label" style={{ marginBottom:8 }}>Distribuzione voti episodi</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={stats.ratingDist} margin={{ top:0,right:0,bottom:0,left:-20 }}>
                  <XAxis dataKey="name" tick={{ fill:'var(--muted)',fontSize:11 }} />
                  <YAxis tick={{ fill:'var(--muted)',fontSize:11 }} />
                  <Tooltip contentStyle={{ background:'var(--mantle)',border:'1px solid var(--surface1)',borderRadius:0,fontSize:12 }} />
                  <Bar dataKey="value" fill="var(--mauve)" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top platforms */}
          {stats.topPlats?.length>0 && (
            <div style={{ marginBottom:20 }}>
              <div className="label" style={{ marginBottom:8 }}>Top piattaforme</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={stats.topPlats} layout="vertical" margin={{ top:0,right:0,bottom:0,left:60 }}>
                  <XAxis type="number" tick={{ fill:'var(--muted)',fontSize:11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill:'var(--dim)',fontSize:11 }} width={60} />
                  <Tooltip contentStyle={{ background:'var(--mantle)',border:'1px solid var(--surface1)',borderRadius:0,fontSize:12 }} />
                  <Bar dataKey="value" fill="var(--sapphire)" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Status bars */}
          <div className="label" style={{ marginBottom:8 }}>Per stato</div>
          <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:20 }}>
            {[['watching','In corso'],['completed','Completate'],['plan_to_watch','Da vedere'],['paused','In pausa'],['dropped','Abbandonate']].map(([k,l])=>{
              const n=stats.byStatus[k]||0; const pct=stats.total?Math.round(n/stats.total*100):0
              return n>0?(
                <div key={k}>
                  <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3 }}>
                    <span>{l}</span><span style={{ color:'var(--muted)' }}>{n} ({pct}%)</span>
                  </div>
                  <div className="progress-bar" style={{ height:4 }}><div className="progress-fill" style={{ width:`${pct}%` }} /></div>
                </div>
              ):null
            })}
          </div>

          {/* Top rated */}
          {stats.topRated?.length>0 && (
            <>
              <div className="label" style={{ marginBottom:8 }}>Le meglio votate</div>
              <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:20 }}>
                {stats.topRated.map((s,i)=>(
                  <div key={s.tmdb_id} style={{ display:'flex',alignItems:'center',gap:10,background:'var(--surface0)',border:'1px solid var(--surface1)',padding:'9px 12px' }}>
                    <span style={{ color:'var(--accent)',fontFamily:'Bebas Neue',fontSize:'1.2rem',width:20 }}>{i+1}</span>
                    <span style={{ flex:1,fontSize:13 }}>{s.title}</span>
                    <span style={{ color:'var(--gold)',fontSize:13,fontWeight:600 }}>★ {s.rating}/10</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── MODIFICA TAB ── */}
      {tab==='Modifica' && (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {saveMsg && <div className={saveMsg.startsWith('Errore')?'msg-error':'msg-ok'}>{saveMsg}</div>}

          <div className="sheet-row">
            <div className="label">Username (a-z, 0-9, _)</div>
            <input className="input" placeholder="username" value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} />
          </div>
          <div className="sheet-row">
            <div className="label">Nome visualizzato</div>
            <input className="input" placeholder="Il tuo nome" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
          </div>
          <div className="sheet-row">
            <div className="label">Bio (max 300 car.)</div>
            <textarea className="input textarea" style={{ minHeight:56 }} value={bio} onChange={e=>setBio(e.target.value.slice(0,300))} />
            <span style={{ fontSize:10,color:'var(--muted)',textAlign:'right' }}>{bio.length}/300</span>
          </div>
          <div className="sheet-row">
            <div className="label">Note profilo (max 500 car.)</div>
            <textarea className="input textarea" value={note} onChange={e=>setNote(e.target.value.slice(0,500))} />
            <span style={{ fontSize:10,color:'var(--muted)',textAlign:'right' }}>{note.length}/500</span>
          </div>
          <div className="sheet-row">
            <div className="label">URL foto profilo (imgur, etc.)</div>
            <input className="input" placeholder="https://i.imgur.com/..." value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} />
          </div>
          <div className="sheet-row">
            <div className="label">URL banner</div>
            <input className="input" placeholder="https://i.imgur.com/..." value={bannerUrl} onChange={e=>setBannerUrl(e.target.value)} />
          </div>
          <div className="sheet-row">
            <div className="label">Link profilo TVTime</div>
            <input className="input" placeholder="https://tvtime.com/u/..." value={tvtimeUrl} onChange={e=>setTvtimeUrl(e.target.value)} />
          </div>
          <div className="sheet-row">
            <div className="label">Link profilo IMDb</div>
            <input className="input" placeholder="https://www.imdb.com/user/..." value={imdbUrl} onChange={e=>setImdbUrl(e.target.value)} />
          </div>
          <div className="sheet-row">
            <div className="label">Link profilo MyAnimeList</div>
            <input className="input" placeholder="https://myanimelist.net/profile/..." value={malUrl} onChange={e=>setMalUrl(e.target.value)} />
          </div>
          <div className="sheet-row">
            <label style={{ display:'flex',alignItems:'center',gap:10,cursor:'pointer' }}>
              <div onClick={()=>setIsPublic(p=>!p)} style={{ width:40,height:22,background:isPublic?'var(--accent)':'var(--surface1)',position:'relative',transition:'background .2s',cursor:'pointer',flexShrink:0 }}>
                <div style={{ position:'absolute',top:3,left:isPublic?21:3,width:16,height:16,background:'white',transition:'left .2s' }} />
              </div>
              <span style={{ fontSize:14 }}>Profilo pubblico</span>
            </label>
          </div>

          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>{saving?'...':'Salva profilo'}</button>
        </div>
      )}
    </div>
  )
}
