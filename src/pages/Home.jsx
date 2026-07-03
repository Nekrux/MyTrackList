import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getTrending, posterUrl } from '../lib/tmdb'
import ShowCard from '../components/ShowCard'
import Spinner from '../components/Spinner'

export default function Home() {
  const { user } = useAuth()
  const [watching, setWatching] = useState([])
  const [episodeCounts, setEpisodeCounts] = useState({})
  const [trending, setTrending] = useState([])
  const [libraryIds, setLibraryIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [showsRes, allShowsRes, trendingRes] = await Promise.all([
        supabase.from('user_shows').select('*').eq('user_id', user.id).eq('status', 'watching').order('updated_at', { ascending: false }).limit(12),
        supabase.from('user_shows').select('tmdb_id').eq('user_id', user.id),
        getTrending().catch(() => ({ results: [] }))
      ])
      if (cancelled) return

      const showsList = showsRes.data || []
      setWatching(showsList)
      setLibraryIds(new Set((allShowsRes.data || []).map(s => s.tmdb_id)))
      setTrending(trendingRes.results?.slice(0, 12) || [])

      if (showsList.length > 0) {
        const { data: episodes } = await supabase
          .from('user_episodes')
          .select('tmdb_show_id')
          .eq('user_id', user.id)
          .in('tmdb_show_id', showsList.map(s => s.tmdb_id))
        const counts = {}
        ;(episodes || []).forEach(e => { counts[e.tmdb_show_id] = (counts[e.tmdb_show_id] || 0) + 1 })
        if (!cancelled) setEpisodeCounts(counts)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  if (loading) return <Spinner label="Caricamento..." />

  return (
    <div className="page">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 52, lineHeight: 0.92, letterSpacing: '0.01em' }}>
          MY<span style={{ color: 'var(--mauve)' }}>TRACK</span>LIST
        </h1>
        <div style={{ height: 3, width: 64, background: 'var(--gold)', marginTop: 10 }} />
        <p style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Serie, anime e cartoni — tutto tracciato
        </p>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 className="section-title">In corso</h2>
        {watching.length === 0 ? (
          <div className="empty-state">
            <h3>Nessuna serie in corso</h3>
            <p>Cerca una serie e aggiungila alla tua libreria per iniziare a tracciarla.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {watching.map(show => (
              <ShowCard key={show.id} show={show} watchedEpisodes={episodeCounts[show.tmdb_id] || 0} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">Di tendenza questa settimana</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {trending.map(t => (
            <Link key={t.id} to={`/serie/${t.id}`} className="card" style={{ display: 'block' }}>
              <div style={{ aspectRatio: '2/3', background: 'var(--surface-hover)', overflow: 'hidden', position: 'relative' }}>
                {t.poster_path ? (
                  <img src={posterUrl(t.poster_path)} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                ) : (
                  <div style={{ padding: 8, fontSize: 11, color: 'var(--subtext)' }}>{t.name}</div>
                )}
                {libraryIds.has(t.id) && (
                  <span className="badge gold" style={{ position: 'absolute', top: 6, left: 6 }}>In libreria</span>
                )}
              </div>
              <div style={{ padding: 8, fontSize: 12, fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {t.name}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
