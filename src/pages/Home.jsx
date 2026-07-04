import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { listShows } from '../lib/db'
import { trendingTv } from '../lib/tmdb'
import { supabase } from '../lib/supabase'
import { Poster, Loader } from '../components/ui'
import { ResultCard } from '../components/cards'

export default function Home() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [inProgress, setInProgress] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [trending, setTrending] = useState([])
  const [libIds, setLibIds] = useState(new Set())

  useEffect(() => {
    let on = true
    ;(async () => {
      try {
        const shows = await listShows(user.id)
        if (!on) return
        setLibIds(new Set(shows.map(s => s.tmdb_id)))
        const active = shows.filter(s => s.status === 'in_corso').slice(0, 12)
        setInProgress(active)

        // progresso per le serie in corso
        const { data: eps } = await supabase.from('user_episodes')
          .select('tmdb_show_id').eq('user_id', user.id)
          .in('tmdb_show_id', active.map(s => s.tmdb_id).length ? active.map(s => s.tmdb_id) : [-1])
        const cnt = {}
        for (const e of (eps || [])) cnt[e.tmdb_show_id] = (cnt[e.tmdb_show_id] || 0) + 1
        setProgressMap(cnt)
      } catch (e) {
        toast.error(e.message)
      }
      try {
        const t = await trendingTv()
        if (on) setTrending(t.slice(0, 12))
      } catch (e) { /* trending non critico */ }
      if (on) setLoading(false)
    })()
    return () => { on = false }
  }, [user.id])

  if (loading) return <Loader />

  return (
    <div className="page page-pad-top">
      <header style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 46, lineHeight: .9, letterSpacing: '.03em',
          background: 'var(--grad-word)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
          MYTRACKLIST
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>Ciao {profile.display_name || profile.username}, cosa hai guardato?</p>
      </header>

      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 className="section-title">In corso</h2>
          {inProgress.length > 0 && <button className="chip" onClick={() => nav('/libreria')}>Vedi tutto</button>}
        </div>
        {inProgress.length === 0 ? (
          <div className="card" style={{ padding: 18, textAlign: 'center' }}>
            <p className="subtext" style={{ marginBottom: 10 }}>Nessuna serie in corso. Aggiungine una dalla ricerca.</p>
            <button className="btn btn-primary" onClick={() => nav('/cerca')}>Cerca serie</button>
          </div>
        ) : (
          <div className="progress-strip">
            {inProgress.map(s => {
              const w = progressMap[s.tmdb_id] || 0
              const pct = s.total_episodes ? Math.min(100, Math.round((w / s.total_episodes) * 100)) : 0
              return (
                <div key={s.tmdb_id} className="ps-card" onClick={() => nav(`/show/${s.tmdb_id}`)}>
                  <div className="ps-poster">
                    <Poster path={s.poster_path} alt={s.title} width={'100%'} />
                    <div className="ps-grad" />
                  </div>
                  <div className="ps-title">{s.title}</div>
                  <div className="prog" style={{ marginTop: 4 }}><i style={{ width: pct + '%' }} /></div>
                  <div className="muted tabular" style={{ fontSize: 10, marginTop: 3 }}>{w}/{s.total_episodes || '?'}</div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section style={{ marginTop: 22 }}>
        <h2 className="section-title">Di tendenza</h2>
        {trending.length === 0 ? <p className="muted">Non riesco a caricare i trend ora.</p> : (
          <div className="grid-3">
            {trending.map(t => <ResultCard key={t.id} item={t} inLibrary={libIds.has(t.id)} />)}
          </div>
        )}
      </section>

      <style>{`
        .progress-strip { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
        .progress-strip::-webkit-scrollbar { display: none; }
        .ps-card { flex: 0 0 116px; cursor: pointer; }
        .ps-poster { position: relative; }
        .ps-grad { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 55%, rgba(203,166,247,.28)); pointer-events: none; }
        .ps-title { font-size: 12px; font-weight: 600; margin-top: 6px; line-height: 1.15;
          display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      `}</style>
    </div>
  )
}
