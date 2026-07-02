import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getTrending, imgUrl } from '../lib/tmdb'
import ShowCard from '../components/ShowCard'

export default function Home() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const [watching,  setWatching]  = useState([])
  const [trending,  setTrending]  = useState([])
  const [epCounts,  setEpCounts]  = useState({})
  const [favIds,    setFavIds]    = useState(new Set())
  const [loadW,     setLoadW]     = useState(true)
  const [loadT,     setLoadT]     = useState(true)

  useEffect(() => { loadWatching(); loadTrending() }, [])

  const loadWatching = async () => {
    setLoadW(true)
    const { data: shows } = await supabase.from('user_shows').select('*').eq('user_id', user.id).eq('status','watching').order('updated_at',{ascending:false}).limit(12)
    const { data: favs  } = await supabase.from('user_favorites').select('tmdb_id').eq('user_id', user.id)
    if (shows?.length) {
      setWatching(shows)
      const { data: eps } = await supabase.from('user_episodes').select('tmdb_show_id').eq('user_id', user.id).in('tmdb_show_id', shows.map(s=>s.tmdb_id))
      const counts = {}; eps?.forEach(e => { counts[e.tmdb_show_id]=(counts[e.tmdb_show_id]||0)+1 }); setEpCounts(counts)
    }
    setFavIds(new Set(favs?.map(f=>f.tmdb_id)||[]))
    setLoadW(false)
  }

  const loadTrending = async () => {
    setLoadT(true)
    try { const d = await getTrending(); setTrending(d.results?.slice(0,9)||[]) } catch {}
    setLoadT(false)
  }

  const toggleFav = async (show) => {
    const isFav = favIds.has(show.tmdb_id)
    if (isFav) {
      await supabase.from('user_favorites').delete().eq('user_id',user.id).eq('tmdb_id',show.tmdb_id)
      setFavIds(p => { const n=new Set(p); n.delete(show.tmdb_id); return n })
    } else {
      await supabase.from('user_favorites').upsert({ user_id:user.id, tmdb_id:show.tmdb_id, title:show.title, poster_path:show.poster_path, position:favIds.size },{ onConflict:'user_id,tmdb_id' })
      setFavIds(p => new Set([...p, show.tmdb_id]))
    }
  }

  return (
    <div className="page">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h1 style={{ fontSize:'2rem', fontFamily:'Bebas Neue', letterSpacing:'.04em' }}>
          MY<span style={{ color:'var(--accent)' }}>TRACK</span>LIST
        </h1>
        <button onClick={signOut} style={{ background:'none', color:'var(--muted)', fontSize:12 }}>Esci</button>
      </div>

      <div className="section-hd">
        <h2 className="section-title">In corso</h2>
        <button onClick={() => nav('/library')} style={{ background:'none', color:'var(--accent)', fontSize:12 }}>Vedi tutto →</button>
      </div>

      {loadW ? <div style={{ display:'flex', justifyContent:'center', padding:32 }}><div className="spinner" /></div>
        : watching.length === 0
          ? <div className="empty-state"><p>Nessuna serie in corso.<br />Cerca qualcosa e aggiungila!</p></div>
          : <div className="show-grid" style={{ marginBottom:24 }}>
              {watching.map(s => <ShowCard key={s.id} show={s} watchedCount={epCounts[s.tmdb_id]||0} isFav={favIds.has(s.tmdb_id)} onFavToggle={toggleFav} />)}
            </div>
      }

      <div className="section-hd">
        <h2 className="section-title">Trending</h2>
        <button onClick={() => nav('/search')} style={{ background:'none', color:'var(--accent)', fontSize:12 }}>Cerca →</button>
      </div>

      {loadT ? <div style={{ display:'flex', justifyContent:'center', padding:24 }}><div className="spinner" /></div>
        : <div className="trending-grid">
            {trending.map(s => (
              <div key={s.id} className="trending-card" onClick={() => nav(`/show/${s.id}`)}>
                {s.poster_path && <img src={imgUrl(s.poster_path,'w342')} alt={s.name} loading="lazy" />}
                <div className="trending-card-title">{s.name}</div>
              </div>
            ))}
          </div>
      }
    </div>
  )
}
