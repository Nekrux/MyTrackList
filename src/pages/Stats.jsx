import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Stats() {
  const { user } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data: shows } = await supabase
      .from('user_shows')
      .select('*')
      .eq('user_id', user.id)

    const { data: eps } = await supabase
      .from('user_episodes')
      .select('tmdb_show_id, watched_at')
      .eq('user_id', user.id)

    if (shows && eps) {
      const byStatus = shows.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1
        return acc
      }, {})

      const byType = shows.reduce((acc, s) => {
        acc[s.media_type] = (acc[s.media_type] || 0) + 1
        return acc
      }, {})

      // Total minutes watched
      const showMap = Object.fromEntries(shows.map(s => [s.tmdb_id, s.episode_runtime || 25]))
      const totalMin = eps.reduce((acc, e) => acc + (showMap[e.tmdb_show_id] || 25), 0)
      const totalHours = Math.round(totalMin / 60)
      const totalDays  = Math.round(totalMin / 60 / 24)

      // Episodes this month
      const now   = new Date()
      const month = now.getMonth()
      const year  = now.getFullYear()
      const thisMonth = eps.filter(e => {
        const d = new Date(e.watched_at)
        return d.getMonth() === month && d.getFullYear() === year
      }).length

      // Top rated shows
      const topRated = [...shows]
        .filter(s => s.rating)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)

      // Recently completed
      const completed = [...shows]
        .filter(s => s.status === 'completed')
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 5)

      setStats({ byStatus, byType, totalHours, totalDays, thisMonth, topRated, completed, total: shows.length })
    }
    setLoading(false)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!stats)  return <div className="page"><p>Nessun dato ancora.</p></div>

  return (
    <div className="page">
      <h1 className="page-title">STATISTICHE</h1>

      {/* Main stats grid */}
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

      {/* By status */}
      <h3 className="section-title" style={{ marginBottom: 12 }}>Per stato</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {[
          ['watching',      'In corso'],
          ['completed',     'Completate'],
          ['plan_to_watch', 'Da vedere'],
          ['paused',        'In pausa'],
          ['dropped',       'Abbandonate'],
        ].map(([key, label]) => {
          const n   = stats.byStatus[key] || 0
          const pct = stats.total ? Math.round((n / stats.total) * 100) : 0
          return n > 0 ? (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{label}</span>
                <span style={{ color: 'var(--text-muted)' }}>{n} ({pct}%)</span>
              </div>
              <div className="progress-bar" style={{ height: 5 }}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : null
        })}
      </div>

      {/* By type */}
      <h3 className="section-title" style={{ marginBottom: 12 }}>Per tipo</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {Object.entries(stats.byType).map(([type, n]) => (
          <div key={type} className="stat-card" style={{ flex: 1 }}>
            <div className="stat-val" style={{ fontSize: '1.6rem' }}>{n}</div>
            <div className="stat-label" style={{ textTransform: 'capitalize' }}>
              {type === 'tv' ? 'Serie TV' : type === 'anime' ? 'Anime' : 'Cartoni'}
            </div>
          </div>
        ))}
      </div>

      {/* Top rated */}
      {stats.topRated.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Le meglio votate</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {stats.topRated.map((s, i) => (
              <div key={s.tmdb_id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)', padding: '10px 14px'
              }}>
                <span style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue', fontSize: '1.3rem', width: 24 }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: 14 }}>{s.title}</span>
                <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>★ {s.rating}/10</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recently completed */}
      {stats.completed.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Completate di recente</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.completed.map(s => (
              <div key={s.tmdb_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)', padding: '10px 14px'
              }}>
                <span style={{ fontSize: 14, flex: 1 }}>{s.title}</span>
                {s.rating && <span style={{ color: 'var(--accent)', fontSize: 13 }}>★ {s.rating}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
