import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getTrending, posterUrl } from '../lib/tmdb'
import ShowCard from '../components/ShowCard'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [watching,  setWatching]  = useState([])
  const [trending,  setTrending]  = useState([])
  const [epCounts,  setEpCounts]  = useState({})
  const [loadingW,  setLoadingW]  = useState(true)
  const [loadingT,  setLoadingT]  = useState(true)

  useEffect(() => { loadWatching(); loadTrending() }, [])

  const loadWatching = async () => {
    setLoadingW(true)
    const { data: shows } = await supabase
      .from('user_shows').select('*')
      .eq('user_id', user.id).eq('status', 'watching')
      .order('updated_at', { ascending: false }).limit(10)

    if (shows?.length) {
      setWatching(shows)
      const { data: eps } = await supabase
        .from('user_episodes').select('tmdb_show_id')
        .eq('user_id', user.id).in('tmdb_show_id', shows.map(s => s.tmdb_id))
      const counts = {}
      eps?.forEach(e => { counts[e.tmdb_show_id] = (counts[e.tmdb_show_id] || 0) + 1 })
      setEpCounts(counts)
    }
    setLoadingW(false)
  }

  const loadTrending = async () => {
    setLoadingT(true)
    try { const d = await getTrending(); setTrending(d.results?.slice(0, 9) || []) } catch {}
    setLoadingT(false)
  }

  return (
    <div className="page">
      <div className="home-header">
        <h1 className="home-title">My<span className="accent">TrackList</span></h1>
        <button onClick={() => navigate('/import')}
          style={{ background: 'none', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>
          Import
        </button>
      </div>

      <div className="section-header">
        <h2 className="section-title">In corso</h2>
      </div>

      {loadingW ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
      ) : watching.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: 28 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          <p>Nessuna serie in corso.<br />Cercane una e aggiungila!</p>
        </div>
      ) : (
        <div className="show-grid" style={{ marginBottom: 28 }}>
          {watching.map(s => <ShowCard key={s.id} show={s} watchedCount={epCounts[s.tmdb_id] || 0} />)}
        </div>
      )}

      <div className="section-header">
        <h2 className="section-title">Trending</h2>
        <button onClick={() => navigate('/search')}
          style={{ background: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>
          Cerca →
        </button>
      </div>

      {loadingT ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
      ) : (
        <div className="trending-grid">
          {trending.map(show => (
            <div key={show.id} className="trending-card" onClick={() => navigate(`/show/${show.id}`)}>
              {show.poster_path && <img src={posterUrl(show.poster_path, 'w342')} alt={show.name} loading="lazy" />}
              <div className="trending-card-title">{show.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
