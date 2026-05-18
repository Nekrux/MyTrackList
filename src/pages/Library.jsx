import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import ShowCard from '../components/ShowCard'

const TABS = [
  { key: 'watching',      label: 'In corso' },
  { key: 'plan_to_watch', label: 'Da vedere' },
  { key: 'completed',     label: 'Completate' },
  { key: 'paused',        label: 'In pausa' },
  { key: 'dropped',       label: 'Abbandonate' },
]
const TYPE_FILTERS = [
  { key: 'all',     label: 'Tutto' },
  { key: 'tv',      label: 'TV' },
  { key: 'anime',   label: 'Anime' },
  { key: 'cartoon', label: 'Cartoni' },
]

export default function Library() {
  const { user } = useAuth()
  const [status,   setStatus]   = useState('watching')
  const [typeF,    setTypeF]    = useState('all')
  const [shows,    setShows]    = useState([])
  const [epCounts, setEpCounts] = useState({})
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { load() }, [status, typeF])

  const load = async () => {
    setLoading(true)
    let q = supabase.from('user_shows').select('*')
      .eq('user_id', user.id).eq('status', status)
      .order('updated_at', { ascending: false })
    if (typeF !== 'all') q = q.eq('media_type', typeF)
    const { data } = await q
    const list = data || []
    setShows(list)

    if (list.length) {
      const { data: eps } = await supabase.from('user_episodes').select('tmdb_show_id')
        .eq('user_id', user.id).in('tmdb_show_id', list.map(s => s.tmdb_id))
      const counts = {}
      eps?.forEach(e => { counts[e.tmdb_show_id] = (counts[e.tmdb_show_id] || 0) + 1 })
      setEpCounts(counts)
    }
    setLoading(false)
  }

  return (
    <div className="page">
      <h1 className="page-title">Libreria</h1>
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab${status === t.key ? ' active' : ''}`} onClick={() => setStatus(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TYPE_FILTERS.map(f => (
          <button key={f.key} className={`chip${typeF === f.key ? ' active' : ''}`} onClick={() => setTypeF(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : shows.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <p>Nessuna serie qui ancora.</p>
        </div>
      ) : (
        <div className="show-grid">
          {shows.map(s => <ShowCard key={s.id} show={s} watchedCount={epCounts[s.tmdb_id] || 0} />)}
        </div>
      )}
    </div>
  )
}
