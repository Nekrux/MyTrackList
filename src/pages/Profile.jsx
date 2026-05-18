import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { posterUrl } from '../lib/tmdb'

const TABS = ['Profilo', 'Statistiche']

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [tab,       setTab]       = useState('Profilo')
  const [profile,   setProfile]   = useState(null)
  const [favorites, setFavorites] = useState([])
  const [stats,     setStats]     = useState(null)
  const [shows,     setShows]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [copied,    setCopied]    = useState(false)

  // Edit state
  const [username,    setUsername]    = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio,         setBio]         = useState('')
  const [avatarUrl,   setAvatarUrl]   = useState('')
  const [bannerUrl,   setBannerUrl]   = useState('')
  const [isPublic,    setIsPublic]    = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState('')

  // Favorites editing
  const [editFavs,    setEditFavs]    = useState(false)
  const [myShows,     setMyShows]     = useState([])
  const [favSearch,   setFavSearch]   = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [{ data: prof }, { data: favs }, { data: allShows }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('user_favorites').select('*').eq('user_id', user.id).order('position'),
      supabase.from('user_shows').select('*').eq('user_id', user.id),
    ])

    setProfile(prof)
    setFavorites(favs || [])
    setShows(allShows || [])

    if (prof) {
      setUsername(prof.username || '')
      setDisplayName(prof.display_name || '')
      setBio(prof.bio || '')
      setAvatarUrl(prof.avatar_url || '')
      setBannerUrl(prof.banner_url || '')
      setIsPublic(prof.is_public !== false)
    }

    // Calcola statistiche
    if (allShows?.length) {
      const { data: eps } = await supabase.from('user_episodes').select('tmdb_show_id,watched_at').eq('user_id', user.id)
      const { data: epDetails } = await supabase.from('episode_details').select('rating').eq('user_id', user.id)

      const byStatus = allShows.reduce((a, s) => { a[s.status] = (a[s.status]||0)+1; return a }, {})
      const byType   = allShows.reduce((a, s) => { a[s.media_type] = (a[s.media_type]||0)+1; return a }, {})
      const showMap  = Object.fromEntries(allShows.map(s => [s.tmdb_id, s.episode_runtime || 25]))
      const totalMin = (eps||[]).reduce((a, e) => a + (showMap[e.tmdb_show_id]||25), 0)
      const now = new Date()
      const thisMonth = (eps||[]).filter(e => {
        const d = new Date(e.watched_at); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()
      }).length

      const ratings = (epDetails||[]).map(d => d.rating).filter(Boolean)
      const avgRating = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1) : null

      const topRated = [...allShows].filter(s=>s.rating).sort((a,b)=>b.rating-a.rating).slice(0,5)

      setStats({
        byStatus, byType, totalMin,
        totalHours: Math.round(totalMin/60),
        totalDays: Math.round(totalMin/60/24),
        thisMonth, avgRating,
        total: allShows.length, topRated
      })
    }
    setLoading(false)
  }

  const saveProfile = async () => {
    setSaving(true); setSaveError('')
    const { error } = await supabase.from('user_profiles').upsert({
      id: user.id, username: username.toLowerCase().replace(/[^a-z0-9_]/g,''),
      display_name: displayName || null,
      bio: bio.slice(0,200) || null,
      avatar_url: avatarUrl || null,
      banner_url: bannerUrl || null,
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    if (error) { setSaveError(error.message); setSaving(false); return }
    await loadAll()
    setEditing(false); setSaving(false)
  }

  const addFavorite = async (show) => {
    if (favorites.length >= 6) return
    if (favorites.find(f => f.tmdb_id === show.tmdb_id)) return
    const newFav = { user_id: user.id, tmdb_id: show.tmdb_id, title: show.title, poster_path: show.poster_path, position: favorites.length }
    const { data } = await supabase.from('user_favorites').insert(newFav).select().single()
    if (data) setFavorites(prev => [...prev, data])
  }

  const removeFavorite = async (tmdbId) => {
    await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('tmdb_id', tmdbId)
    setFavorites(prev => prev.filter(f => f.tmdb_id !== tmdbId))
  }

  const copyLink = () => {
    if (!profile?.username) return
    const url = `${window.location.origin}/u/${profile.username}`
    navigator.clipboard.writeText(url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const filteredShows = myShows.length ? myShows.filter(s => s.title.toLowerCase().includes(favSearch.toLowerCase())) : shows.filter(s => s.title.toLowerCase().includes(favSearch.toLowerCase()))

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const publicUrl = profile?.username ? `${window.location.origin}/u/${profile.username}` : null

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      {/* Banner */}
      <div className="profile-banner">
        {bannerUrl && !editing && <img src={bannerUrl} alt="" />}
        {profile?.banner_url && !editing && <img src={profile.banner_url} alt="" />}
      </div>

      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {(editing ? avatarUrl : profile?.avatar_url)
            ? <img src={editing ? avatarUrl : profile?.avatar_url} alt="" />
            : <div className="profile-avatar-placeholder">👤</div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile-name">{profile?.display_name || profile?.username || 'Il tuo profilo'}</div>
          {profile?.username && <div className="profile-username">@{profile.username}</div>}
          {profile?.bio && <div className="profile-bio">{profile.bio}</div>}
        </div>
      </div>

      {/* Public link */}
      {publicUrl && profile?.is_public && !editing && (
        <div style={{ marginBottom: 16 }}>
          <div className="share-link">
            <span style={{ flex: 1 }}>{publicUrl}</span>
            <button
              onClick={copyLink}
              style={{ background: 'none', color: copied ? 'var(--green)' : 'var(--accent)', fontSize: 13, flexShrink: 0 }}
            >
              {copied ? '✓ Copiato' : 'Copia link'}
            </button>
          </div>
        </div>
      )}

      {/* Edit / actions */}
      {!editing && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(true)}>✎ Modifica profilo</button>
          <button className="btn btn-ghost" onClick={signOut} style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>Esci</button>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', marginBottom: 16 }}>Modifica profilo</h3>

          {saveError && <div className="error-msg" style={{ marginBottom: 12 }}>{saveError}</div>}

          <div className="sheet-row">
            <div className="sheet-label">Username (solo lettere, numeri, _)</div>
            <input className="input" placeholder="il_tuo_username" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} />
          </div>
          <div className="sheet-row">
            <div className="sheet-label">Nome visualizzato</div>
            <input className="input" placeholder="Il tuo nome" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="sheet-row">
            <div className="sheet-label">Bio (max 200 caratteri)</div>
            <textarea className="input textarea" style={{ minHeight: 60 }} placeholder="Qualcosa su di te..." value={bio} onChange={e => setBio(e.target.value.slice(0,200))} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{bio.length}/200</span>
          </div>
          <div className="sheet-row">
            <div className="sheet-label">URL foto profilo</div>
            <input className="input" placeholder="https://imgur.com/..." value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Carica su imgur.com e incolla il link diretto</span>
          </div>
          <div className="sheet-row">
            <div className="sheet-label">URL banner</div>
            <input className="input" placeholder="https://imgur.com/..." value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} />
          </div>
          <div className="sheet-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div onClick={() => setIsPublic(p => !p)} style={{ width: 44, height: 24, borderRadius: 12, background: isPublic ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background .2s', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', top: 3, left: isPublic ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left .2s' }} />
              </div>
              <span style={{ fontSize: 14 }}>Profilo pubblico</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={saveProfile} disabled={saving} style={{ flex: 1 }}>{saving ? 'Salvo...' : 'Salva'}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Annulla</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── Profilo tab ── */}
      {tab === 'Profilo' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 className="section-title">Serie preferite</h3>
            <button onClick={() => setEditFavs(e => !e)} style={{ background: 'none', color: 'var(--accent)', fontSize: 13 }}>
              {editFavs ? 'Fine' : '✎ Modifica'}
            </button>
          </div>

          <div className="favorites-grid" style={{ marginBottom: 24 }}>
            {Array.from({ length: 6 }, (_, i) => {
              const fav = favorites[i]
              return fav ? (
                <div key={fav.tmdb_id} className="fav-card" onClick={() => !editFavs && navigate(`/show/${fav.tmdb_id}`)}>
                  {fav.poster_path
                    ? <img src={posterUrl(fav.poster_path, 'w185')} alt={fav.title} loading="lazy" />
                    : <div className="fav-card-empty">{fav.title[0]}</div>
                  }
                  {editFavs && (
                    <button className="fav-card-remove" onClick={e => { e.stopPropagation(); removeFavorite(fav.tmdb_id) }}>✕</button>
                  )}
                </div>
              ) : (
                <div key={i} className="fav-card" style={{ cursor: editFavs ? 'pointer' : 'default' }}
                  onClick={() => editFavs && setEditFavs(true)}>
                  <div className="fav-card-empty" style={{ color: 'var(--border)' }}>
                    {editFavs ? '+' : ''}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Cerca serie da aggiungere ai preferiti */}
          {editFavs && (
            <div style={{ marginBottom: 24 }}>
              <div className="sheet-label" style={{ marginBottom: 8 }}>Cerca nelle tue serie</div>
              <input className="input" placeholder="Cerca..." value={favSearch} onChange={e => setFavSearch(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {filteredShows.slice(0,10).map(s => (
                  <button key={s.tmdb_id} className="show-card" onClick={() => addFavorite(s)} style={{ opacity: favorites.find(f=>f.tmdb_id===s.tmdb_id) ? .4 : 1 }}>
                    <div className="show-card-poster">
                      {s.poster_path ? <img src={posterUrl(s.poster_path,'w185')} alt={s.title} /> : <span>?</span>}
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
        </>
      )}

      {/* ── Statistiche tab ── */}
      {tab === 'Statistiche' && stats && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-val">{stats.totalHours.toLocaleString()}</div>
              <div className="stat-label">Ore guardate</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{stats.totalDays}</div>
              <div className="stat-label">Giorni di visione</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{stats.total}</div>
              <div className="stat-label">Serie totali</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{stats.thisMonth}</div>
              <div className="stat-label">Ep. questo mese</div>
            </div>
          </div>

          {stats.avgRating && (
            <div className="stat-card" style={{ marginBottom: 20 }}>
              <div className="stat-val">{(stats.avgRating * 2).toFixed(1)}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/10</span></div>
              <div className="stat-label">Voto medio episodi</div>
            </div>
          )}

          <h3 className="section-title" style={{ marginBottom: 12 }}>Per stato</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {[['watching','In corso'],['completed','Completate'],['plan_to_watch','Da vedere'],['paused','In pausa'],['dropped','Abbandonate']].map(([k,l]) => {
              const n = stats.byStatus[k]||0
              const pct = stats.total ? Math.round(n/stats.total*100) : 0
              return n > 0 ? (
                <div key={k}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                    <span>{l}</span><span style={{ color:'var(--text-muted)' }}>{n} ({pct}%)</span>
                  </div>
                  <div className="progress-bar" style={{ height:5 }}>
                    <div className="progress-fill" style={{ width:`${pct}%` }} />
                  </div>
                </div>
              ) : null
            })}
          </div>

          {stats.topRated.length > 0 && (
            <>
              <h3 className="section-title" style={{ marginBottom: 12 }}>Le meglio votate</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
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
    </div>
  )
}
