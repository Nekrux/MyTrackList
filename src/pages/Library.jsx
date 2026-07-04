import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { listShows, listFavorites, addFavorite, removeFavorite } from '../lib/db'
import { supabase } from '../lib/supabase'
import { STATUSES, SHOW_TYPES, GENRES } from '../lib/constants'
import { LibraryCard } from '../components/cards'
import { Loader, Empty } from '../components/ui'

const STATUS_TABS = [{ key: 'tutto', label: 'Tutto' }, ...STATUSES.map(s => ({ key: s.key, label: s.label }))]

export default function Library() {
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [shows, setShows] = useState([])
  const [counts, setCounts] = useState({})
  const [favIds, setFavIds] = useState(new Set())
  const [status, setStatus] = useState('tutto')
  const [type, setType] = useState('tutti')
  const [genre, setGenre] = useState(null)

  const load = async () => {
    try {
      const [s, favs] = await Promise.all([listShows(user.id), listFavorites(user.id)])
      setShows(s)
      setFavIds(new Set(favs.map(f => f.tmdb_id)))
      const { data: eps } = await supabase.from('user_episodes').select('tmdb_show_id').eq('user_id', user.id)
      const c = {}
      for (const e of (eps || [])) c[e.tmdb_show_id] = (c[e.tmdb_show_id] || 0) + 1
      setCounts(c)
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }
  useEffect(() => { load() }, [user.id])

  const toggleFav = async (show) => {
    const isFav = favIds.has(show.tmdb_id)
    try {
      if (isFav) { await removeFavorite(user.id, show.tmdb_id); setFavIds(p => { const n = new Set(p); n.delete(show.tmdb_id); return n }) }
      else {
        if (favIds.size >= 6) return toast.error('Massimo 6 serie preferite. Rimuovine una dal profilo.')
        await addFavorite(user.id, { tmdb_id: show.tmdb_id, title: show.title, poster_path: show.poster_path }, favIds.size)
        setFavIds(p => new Set(p).add(show.tmdb_id))
      }
    } catch (e) { toast.error(e.message) }
  }

  const filtered = useMemo(() => shows.filter(s => {
    if (status !== 'tutto' && s.status !== status) return false
    if (type !== 'tutti' && s.show_type !== type) return false
    if (genre) { try { if (!(JSON.parse(s.genres || '[]')).includes(genre)) return false } catch { return false } }
    return true
  }), [shows, status, type, genre])

  if (loading) return <Loader />

  return (
    <div className="page page-pad-top">
      <h1 className="section-title" style={{ fontSize: 30 }}>Libreria</h1>

      <div className="chip-row" style={{ marginBottom: 10 }}>
        {STATUS_TABS.map(t => (
          <button key={t.key} className={'chip' + (status === t.key ? ' on' : '')} onClick={() => setStatus(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="chip-row" style={{ marginBottom: 10 }}>
        <button className={'chip' + (type === 'tutti' ? ' on' : '')} onClick={() => setType('tutti')}>Tutti</button>
        {SHOW_TYPES.map(t => (
          <button key={t.key} className={'chip' + (type === t.key ? ' on' : '')} onClick={() => setType(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="chip-row" style={{ marginBottom: 14 }}>
        {GENRES.map(g => (
          <button key={g} className={'chip' + (genre === g ? ' on' : '')} onClick={() => setGenre(genre === g ? null : g)}>{g}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty title="Vuoto qui">{shows.length === 0 ? 'Aggiungi la tua prima serie dalla ricerca, o importa da TVTime.' : 'Nessuna serie con questi filtri.'}</Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => (
            <LibraryCard key={s.tmdb_id} show={s} watched={counts[s.tmdb_id] || 0} total={s.total_episodes || 0}
              isFav={favIds.has(s.tmdb_id)} onToggleFav={toggleFav} />
          ))}
        </div>
      )}
    </div>
  )
}
