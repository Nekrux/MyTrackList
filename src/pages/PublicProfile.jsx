import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { posterUrl } from '../lib/tmdb'

export default function PublicProfile() {
  const { username } = useParams()
  const navigate = useNavigate()

  const [profile,   setProfile]   = useState(null)
  const [favorites, setFavorites] = useState([])
  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [tab,       setTab]       = useState('Profilo')

  useEffect(() => { load() }, [username])

  const load = async () => {
    setLoading(true)
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .eq('is_public', true)
      .maybeSingle()

    if (!prof) { setNotFound(true); setLoading(false); return }
    setProfile(prof)

    const [{ data: favs }, { data: shows }] = await Promise.all([
      supabase.from('user_favorites').select('*').eq('user_id', prof.id).order('position'),
      supabase.from('user_shows').select('*').eq('user_id', prof.id),
    ])

    setFavorites(favs || [])

    if (shows?.length) {
      const { data: eps } = await supabase.from('user_episodes').select('tmdb_show_id,watched_at').eq('user_id', prof.id)
      const showMap = Object.fromEntries(shows.map(s => [s.tmdb_id, s.episode_runtime||25]))
      const totalMin = (eps||[]).reduce((a,e) => a+(showMap[e.tmdb_show_id]||25),0)
      const byStatus = shows.reduce((a,s) => { a[s.status]=(a[s.status]||0)+1; return a },{})
      const topRated = [...shows].filter(s=>s.rating).sort((a,b)=>b.rating-a.rating).slice(0,5)
      setStats({ totalHours: Math.round(totalMin/60), totalDays: Math.round(totalMin/60/24), total: shows.length, byStatus, topRated })
    }
    setLoading(false)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  if (notFound) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: '4rem', color: 'var(--accent)', marginBottom: 8 }}>404</div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Profilo non trovato o privato</p>
      <button className="btn btn-ghost" onClick={() => navigate('/')}>Vai alla home</button>
    </div>
  )

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* Banner */}
      <div className="profile-banner">
        {profile.banner_url && <img src={profile.banner_url} alt="" />}
      </div>

      <div style={{ padding: '0 16px 40px' }}>
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" />
              : <div className="profile-avatar-placeholder">👤</div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="profile-name">{profile.display_name || profile.username}</div>
            <div className="profile-username">@{profile.username}</div>
            {profile.bio && <div className="profile-bio">{profile.bio}</div>}
          </div>
        </div>

        {/* Stats strip */}
        {stats && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[
              [stats.totalHours, 'ore'],
              [stats.total, 'serie'],
              [stats.byStatus?.completed||0, 'completate'],
            ].map(([v,l]) => (
              <div key={l} style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'12px 8px', textAlign:'center' }}>
                <div style={{ fontFamily:'Bebas Neue', fontSize:'1.6rem', color:'var(--accent)' }}>{v}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {['Profilo','Statistiche'].map(t => (
            <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* Profilo tab */}
        {tab === 'Profilo' && (
          <>
            <h3 className="section-title" style={{ marginBottom: 12 }}>Serie preferite</h3>
            {favorites.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Nessuna serie preferita ancora.</p>
            ) : (
              <div className="favorites-grid">
                {favorites.map(fav => (
                  <div key={fav.tmdb_id} className="fav-card">
                    {fav.poster_path
                      ? <img src={posterUrl(fav.poster_path,'w185')} alt={fav.title} loading="lazy" />
                      : <div className="fav-card-empty">{fav.title[0]}</div>
                    }
                    <div className="trending-card-title">{fav.title}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Stats tab */}
        {tab === 'Statistiche' && stats && (
          <>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-val">{stats.totalHours.toLocaleString()}</div><div className="stat-label">Ore guardate</div></div>
              <div className="stat-card"><div className="stat-val">{stats.totalDays}</div><div className="stat-label">Giorni di visione</div></div>
              <div className="stat-card"><div className="stat-val">{stats.total}</div><div className="stat-label">Serie totali</div></div>
              <div className="stat-card"><div className="stat-val">{stats.byStatus?.completed||0}</div><div className="stat-label">Completate</div></div>
            </div>

            {stats.topRated.length > 0 && (
              <>
                <h3 className="section-title" style={{ marginBottom: 12 }}>Le meglio votate</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {stats.topRated.map((s,i) => (
                    <div key={s.tmdb_id} style={{ display:'flex', alignItems:'center', gap:12, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'10px 14px' }}>
                      <span style={{ color:'var(--accent)', fontFamily:'Bebas Neue', fontSize:'1.3rem', width:24 }}>{i+1}</span>
                      <span style={{ flex:1, fontSize:14 }}>{s.title}</span>
                      <span style={{ color:'var(--yellow)', fontSize:14, fontWeight:600 }}>★ {s.rating}/10</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)', fontSize: 13 }}>
          <span style={{ fontFamily: 'Bebas Neue', color: 'var(--accent)', fontSize: '1.2rem', letterSpacing: '.06em' }}>MYTRACKLIST</span>
        </div>
      </div>
    </div>
  )
}
