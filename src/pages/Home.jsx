import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { tmdb, IMG } from '../lib/tmdb'
import { useAuth } from '../context/AuthContext'
import SectionHead from '../components/SectionHead'
import ProgressBar from '../components/ProgressBar'

export default function Home() {
  const { user } = useAuth()
  const [inCorso, setInCorso] = useState(null)
  const [progress, setProgress] = useState({})
  const [trending, setTrending] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let on = true
    async function load() {
      try {
        const { data: shows, error: e1 } = await supabase
          .from('user_shows').select('*')
          .eq('user_id', user.id).eq('status', 'in_corso')
          .order('updated_at', { ascending: false }).limit(12)
        if (e1) throw new Error(e1.message)
        if (!on) return
        setInCorso(shows ?? [])

        if (shows?.length) {
          const { data: prog } = await supabase
            .from('v_show_progress').select('*')
            .eq('user_id', user.id)
            .in('tmdb_show_id', shows.map((s) => s.tmdb_id))
          if (on && prog) {
            setProgress(Object.fromEntries(prog.map((p) => [p.tmdb_show_id, p.watched])))
          }
        }

        const tr = await tmdb.trending()
        if (on) setTrending((tr.results ?? []).slice(0, 15))
      } catch (err) {
        if (on) setError(err.message)
      }
    }
    load()
    return () => { on = false }
  }, [user.id])

  return (
    <>
      <div className="topbar">
        <span className="wordmark">MYTRACKLIST</span>
        <span className="chip chip-mauve">V3</span>
      </div>

      {error && (
        <div className="banner banner-error mt-16">
          <span className="banner-tag">ERR</span>
          <span className="banner-msg mono">{error}</span>
        </div>
      )}

      <SectionHead title="IN CORSO" tag={inCorso ? `${inCorso.length} serie` : '…'} />
      {inCorso?.length === 0 && (
        <div className="empty-state">
          <span className="overline">// vuoto</span>
          Nessuna serie in corso: cerca un titolo e aggiungilo.
        </div>
      )}
      {inCorso?.length > 0 && (
        <div className="hstrip">
          {inCorso.map((s) => (
            <Link key={s.tmdb_id} to={`/serie/${s.tmdb_id}`} className="tile">
              {s.poster_path
                ? <img className="tile-poster" src={IMG(s.poster_path)} alt="" loading="lazy" />
                : <div className="tile-poster poster-empty">{s.title.charAt(0)}</div>}
              <div className="tile-title">{s.title}</div>
              {s.total_episodes > 0 && (
                <ProgressBar value={progress[s.tmdb_id] ?? 0} max={s.total_episodes} />
              )}
            </Link>
          ))}
        </div>
      )}

      <SectionHead title="TRENDING" tag="tmdb · settimana" />
      {!trending && !error && (
        <div className="empty-state"><span className="overline">// caricamento…</span></div>
      )}
      {trending && (
        <div className="hstrip">
          {trending.map((t) => (
            <Link key={t.id} to={`/serie/${t.id}`} className="tile">
              {t.poster_path
                ? <img className="tile-poster" src={IMG(t.poster_path)} alt="" loading="lazy" />
                : <div className="tile-poster poster-empty">{t.name?.charAt(0)}</div>}
              <div className="tile-title">{t.name}</div>
              <div className="tile-sub mono">
                {[t.first_air_date?.slice(0, 4), t.vote_average ? `★${t.vote_average.toFixed(1)}` : null]
                  .filter(Boolean).join(' · ')}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
