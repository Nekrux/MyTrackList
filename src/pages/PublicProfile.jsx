import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { imgUrl } from '../lib/tmdb'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const PIE_COLORS = ['#cba6f7','#a6e3a1','#f38ba8','#89b4fa','#f9e2af']

export default function PublicProfile() {
  const { username } = useParams()
  const nav = useNavigate()
  const [profile,   setProfile]   = useState(null)
  const [favorites, setFavorites] = useState([])
  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [tab,       setTab]       = useState('Profilo')

  useEffect(() => { load() }, [username])

  const load = async () => {
    setLoading(true)
    const { data:prof } = await supabase.from('user_profiles').select('*').eq('username',username.toLowerCase()).eq('is_public',true).maybeSingle()
    if (!prof) { setNotFound(true); setLoading(false); return }
    setProfile(prof)
    const [{ data:favs }, { data:shows }] = await Promise.all([
      supabase.from('user_favorites').select('*').eq('user_id',prof.id).order('position'),
      supabase.from('user_shows').select('*').eq('user_id',prof.id),
    ])
    setFavorites(favs||[])
    if (shows?.length) {
      const { data:eps } = await supabase.from('user_episodes').select('tmdb_show_id,watched_at').eq('user_id',prof.id)
      const showMap  = Object.fromEntries(shows.map(s=>[s.tmdb_id,s.episode_runtime||25]))
      const totalMin = (eps||[]).reduce((a,e)=>a+(showMap[e.tmdb_show_id]||25),0)
      const byStatus = shows.reduce((a,s)=>{ a[s.status]=(a[s.status]||0)+1; return a },{})
      const byType   = shows.reduce((a,s)=>{ a[s.media_type]=(a[s.media_type]||0)+1; return a },{})
      const typePie  = Object.entries(byType).map(([k,v])=>({ name:{tv:'Serie TV',anime:'Anime',cartoon:'Cartoni'}[k]||k, value:v }))
      const topRated = [...shows].filter(s=>s.rating).sort((a,b)=>b.rating-a.rating).slice(0,5)
      setStats({ totalHours:Math.round(totalMin/60), totalDays:Math.round(totalMin/60/24), total:shows.length, byStatus, typePie, topRated })
    }
    setLoading(false)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (notFound) return (
    <div style={{ minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24 }}>
      <div style={{ fontFamily:'Bebas Neue',fontSize:'4rem',color:'var(--accent)' }}>404</div>
      <p style={{ color:'var(--muted)',marginBottom:16 }}>Profilo non trovato o privato</p>
      <button className="btn btn-ghost" onClick={()=>nav('/')}>Home</button>
    </div>
  )

  return (
    <div style={{ maxWidth:700,margin:'0 auto',minHeight:'100dvh',background:'var(--bg)' }}>
      {/* Banner */}
      <div className="profile-banner" style={{ height:180 }}>
        {profile.banner_url && <img src={profile.banner_url} alt="" />}
      </div>

      <div style={{ padding:'0 14px 40px' }}>
        <div className="profile-hd">
          <div className="profile-avatar">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontSize:28 }}>👤</div>}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div className="profile-name">{profile.display_name||profile.username}</div>
            <div className="profile-username">@{profile.username}</div>
            {profile.bio && <div className="profile-bio">{profile.bio}</div>}
            {(profile.social_tvtime||profile.social_mal||profile.social_imdb) && (
              <div className="social-links" style={{ marginTop:6 }}>
                {profile.social_tvtime && <a href={profile.social_tvtime} target="_blank" rel="noopener" className="social-link">TVTime</a>}
                {profile.social_imdb   && <a href={profile.social_imdb}   target="_blank" rel="noopener" className="social-link">IMDb</a>}
                {profile.social_mal    && <a href={profile.social_mal}    target="_blank" rel="noopener" className="social-link">MAL</a>}
              </div>
            )}
          </div>
        </div>

        {profile.note && (
          <div style={{ background:'var(--surface0)',border:'1px solid var(--surface1)',padding:'10px 12px',fontSize:13,color:'var(--subtext)',lineHeight:1.5,marginBottom:14 }}>
            {profile.note}
          </div>
        )}

        {/* Stats strip */}
        {stats && (
          <div style={{ display:'flex',gap:6,marginBottom:16 }}>
            {[[stats.totalHours,'ore'],[stats.total,'serie'],[stats.byStatus?.completed||0,'completate']].map(([v,l])=>(
              <div key={l} style={{ flex:1,background:'var(--surface0)',border:'1px solid var(--surface1)',padding:'10px 6px',textAlign:'center' }}>
                <div style={{ fontFamily:'Bebas Neue',fontSize:'1.5rem',color:'var(--accent)' }}>{v}</div>
                <div style={{ fontSize:10,color:'var(--muted)' }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        <div className="tabs">
          {['Profilo','Statistiche'].map(t=><button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>{t}</button>)}
        </div>

        {tab==='Profilo' && (
          <>
            <div className="section-hd"><h3 className="section-title">Serie preferite</h3></div>
            {favorites.length===0
              ? <p style={{ color:'var(--muted)',fontSize:13 }}>Nessuna preferita ancora.</p>
              : <div className="favorites-grid">
                  {favorites.map(fav=>(
                    <div key={fav.tmdb_id} className="fav-card">
                      {fav.poster_path?<img src={imgUrl(fav.poster_path,'w185')} alt={fav.title} loading="lazy" />:<div className="fav-card-empty">{fav.title[0]}</div>}
                      <div className="trending-card-title" style={{ fontSize:10 }}>{fav.title}</div>
                    </div>
                  ))}
                </div>
            }
          </>
        )}

        {tab==='Statistiche' && stats && (
          <>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-val">{stats.totalHours.toLocaleString()}</div><div className="stat-label">Ore guardate</div></div>
              <div className="stat-card"><div className="stat-val">{stats.totalDays}</div><div className="stat-label">Giorni</div></div>
              <div className="stat-card"><div className="stat-val">{stats.total}</div><div className="stat-label">Serie totali</div></div>
              <div className="stat-card"><div className="stat-val">{stats.byStatus?.completed||0}</div><div className="stat-label">Completate</div></div>
            </div>
            {stats.typePie?.length>0 && (
              <div style={{ marginBottom:20 }}>
                <div className="label" style={{ marginBottom:8 }}>Per tipologia</div>
                <div style={{ display:'flex',alignItems:'center',gap:16 }}>
                  <ResponsiveContainer width="50%" height={120}>
                    <PieChart><Pie data={stats.typePie} dataKey="value" cx="50%" cy="50%" outerRadius={50}>
                      {stats.typePie.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                    </Pie></PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                    {stats.typePie.map((d,i)=>(
                      <div key={d.name} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12 }}>
                        <div style={{ width:8,height:8,background:PIE_COLORS[i%PIE_COLORS.length],flexShrink:0 }} />
                        <span>{d.name}: {d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {stats.topRated?.length>0 && (
              <>
                <div className="label" style={{ marginBottom:8 }}>Le meglio votate</div>
                {stats.topRated.map((s,i)=>(
                  <div key={s.tmdb_id} style={{ display:'flex',alignItems:'center',gap:10,background:'var(--surface0)',border:'1px solid var(--surface1)',padding:'9px 12px',marginBottom:5 }}>
                    <span style={{ color:'var(--accent)',fontFamily:'Bebas Neue',fontSize:'1.1rem',width:18 }}>{i+1}</span>
                    <span style={{ flex:1,fontSize:13 }}>{s.title}</span>
                    <span style={{ color:'var(--gold)',fontSize:13 }}>★ {s.rating}/10</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        <div style={{ textAlign:'center',marginTop:40,fontFamily:'Bebas Neue',color:'var(--accent)',fontSize:'1.2rem',letterSpacing:'.06em' }}>MYTRACKLIST</div>
      </div>
    </div>
  )
}
