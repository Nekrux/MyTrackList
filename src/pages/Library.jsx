import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import ShowCard from '../components/ShowCard'
import { MAIN_GENRES } from '../lib/tmdb'

const STATUSES = [
  { key:'all',           label:'Tutto' },
  { key:'watching',      label:'In corso' },
  { key:'plan_to_watch', label:'Da vedere' },
  { key:'completed',     label:'Completate' },
  { key:'paused',        label:'In pausa' },
  { key:'dropped',       label:'Abbandonate' },
]
const TYPES = [
  { key:'all',      label:'Tutti' },
  { key:'tv',       label:'Serie TV' },
  { key:'anime',    label:'Anime' },
  { key:'cartoon',  label:'Cartoni' },
]

export default function Library() {
  const { user } = useAuth()
  const [status,   setStatus]   = useState('all')
  const [typeF,    setTypeF]    = useState('all')
  const [genreF,   setGenreF]   = useState(null)
  const [shows,    setShows]    = useState([])
  const [epCounts, setEpCounts] = useState({})
  const [favIds,   setFavIds]   = useState(new Set())
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { load() }, [status, typeF, genreF])

  const load = async () => {
    setLoading(true)
    // Fetch tutti gli show con i filtri applicabili lato DB
    let q = supabase.from('user_shows').select('*').eq('user_id', user.id).order('updated_at',{ascending:false})
    if (status !== 'all') q = q.eq('status', status)
    if (typeF  !== 'all') q = q.eq('media_type', typeF)

    const [{ data: list }, { data: favs }] = await Promise.all([
      q,
      supabase.from('user_favorites').select('tmdb_id').eq('user_id', user.id)
    ])

    let shows = list || []

    // Filtro genere lato client (genres è JSON array come stringa)
    if (genreF) {
      shows = shows.filter(s => {
        try {
          const g = JSON.parse(s.genres || '[]')
          return g.some(name => name.toLowerCase().includes(genreF.toLowerCase()))
        } catch { return false }
      })
    }

    setShows(shows)
    setFavIds(new Set(favs?.map(f=>f.tmdb_id)||[]))

    if (shows.length) {
      const { data: eps } = await supabase.from('user_episodes').select('tmdb_show_id').eq('user_id',user.id).in('tmdb_show_id', shows.map(s=>s.tmdb_id))
      const counts = {}
      eps?.forEach(e => { counts[e.tmdb_show_id]=(counts[e.tmdb_show_id]||0)+1 })
      setEpCounts(counts)
    }
    setLoading(false)
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
      <h1 className="page-title">LIBRERIA</h1>

      {/* Status tabs */}
      <div className="tabs">
        {STATUSES.map(s => <button key={s.key} className={`tab${status===s.key?' active':''}`} onClick={()=>setStatus(s.key)}>{s.label}</button>)}
      </div>

      {/* Type filter */}
      <div style={{ display:'flex', gap:5, marginBottom:8, flexWrap:'wrap' }}>
        {TYPES.map(t => <button key={t.key} className={`chip${typeF===t.key?' active':''}`} onClick={()=>setTypeF(t.key)}>{t.label}</button>)}
      </div>

      {/* Genre filter — usa i nomi esatti TMDB it-IT */}
      <div style={{ display:'flex', gap:5, marginBottom:14, flexWrap:'wrap' }}>
        <button className={`chip${!genreF?' active':''}`} onClick={()=>setGenreF(null)}>Tutti i generi</button>
        {MAIN_GENRES.map(g => (
          <button key={g} className={`chip${genreF===g?' active':''}`} onClick={()=>setGenreF(genreF===g?null:g)}>{g}</button>
        ))}
      </div>

      {loading
        ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner" /></div>
        : shows.length === 0
          ? <div className="empty-state"><p>Nessuna serie qui ancora.</p></div>
          : <div className="show-grid">
              {shows.map(s => <ShowCard key={s.id} show={s} watchedCount={epCounts[s.tmdb_id]||0} isFav={favIds.has(s.tmdb_id)} onFavToggle={toggleFav} />)}
            </div>
      }
    </div>
  )
}
