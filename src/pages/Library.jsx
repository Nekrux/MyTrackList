import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { STATUSES, MEDIA_TYPES } from '../lib/tmdb'
import ShowCard from '../components/ShowCard'
import Spinner from '../components/Spinner'

const GENRES = [
  'Dramma', 'Commedia', 'Crime', 'Sci-Fi & Fantasy', 'Mistero',
  'Azione & Avventura', 'Animazione', 'Famiglia', 'Western',
  'Documentario', 'Per Bambini', 'Guerra & Politica'
]

export default function Library() {
  const { user } = useAuth()
  const [shows, setShows] = useState([])
  const [episodeCounts, setEpisodeCounts] = useState({})
  const [favorites, setFavorites] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [genre, setGenre] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const [showsRes, favRes] = await Promise.all([
        supabase.from('user_shows').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('user_favorites').select('tmdb_id').eq('user_id', user.id)
      ])
      if (cancelled) return
      const list = showsRes.data || []
      setShows(list)
      setFavorites(new Set((favRes.data || []).map(f => f.tmdb_id)))

      if (list.length > 0) {
        const { data: episodes } = await supabase
          .from('user_episodes')
          .select('tmdb_show_id')
          .eq('user_id', user.id)
          .in('tmdb_show_id', list.map(s => s.tmdb_id))
        const counts = {}
        ;(episodes || []).forEach(e => { counts[e.tmdb_show_id] = (counts[e.tmdb_show_id] || 0) + 1 })
        if (!cancelled) setEpisodeCounts(counts)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  async function toggleFavorite(show) {
    if (!user) return
    const isFav = favorites.has(show.tmdb_id)
    if (isFav) {
      await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('tmdb_id', show.tmdb_id)
      setFavorites(prev => { const s = new Set(prev); s.delete(show.tmdb_id); return s })
    } else {
      if (favorites.size >= 6) {
        alert('Puoi avere al massimo 6 serie preferite. Rimuovine una dal profilo prima di aggiungerne un\'altra.')
        return
      }
      await supabase.from('user_favorites').insert({
        user_id: user.id, tmdb_id: show.tmdb_id, title: show.title, poster_path: show.poster_path, position: favorites.size
      })
      setFavorites(prev => new Set(prev).add(show.tmdb_id))
    }
  }

  const filtered = useMemo(() => {
    return shows.filter(s => {
      if (status !== 'all' && s.status !== status) return false
      if (type !== 'all' && s.media_type !== type) return false
      if (genre) {
        const showGenres = s.genres ? JSON.parse(s.genres) : []
        if (!showGenres.includes(genre)) return false
      }
      return true
    })
  }, [shows, status, type, genre])

  if (loading) return <Spinner label="Caricamento libreria..." />

  return (
    <div className="page">
      <div className="eyebrow">MyTrackList</div>
      <h1 style={{ fontSize: 30, marginBottom: 16 }}>Libreria</h1>

      <div className="chip-row" style={{ marginBottom: 10 }}>
        <button className={`chip ${status === 'all' ? 'active' : ''}`} onClick={() => setStatus('all')}>Tutto</button>
        {STATUSES.map(s => (
          <button key={s.value} className={`chip ${status === s.value ? 'active' : ''}`} onClick={() => setStatus(s.value)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="chip-row" style={{ marginBottom: 10 }}>
        <button className={`chip ${type === 'all' ? 'active' : ''}`} onClick={() => setType('all')}>Tutti</button>
        {MEDIA_TYPES.map(t => (
          <button key={t.value} className={`chip ${type === t.value ? 'active' : ''}`} onClick={() => setType(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="chip-row" style={{ marginBottom: 20 }}>
        {GENRES.map(g => (
          <button key={g} className={`chip ${genre === g ? 'active' : ''}`} onClick={() => setGenre(genre === g ? null : g)}>
            {g}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>Nessuna serie trovata</h3>
          <p>Prova a cambiare i filtri, oppure aggiungi nuove serie dalla ricerca.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {filtered.map(show => (
            <ShowCard
              key={show.id}
              show={show}
              watchedEpisodes={episodeCounts[show.tmdb_id] || 0}
              isFavorite={favorites.has(show.tmdb_id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
