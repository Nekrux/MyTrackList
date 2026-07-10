import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IMG } from '../lib/tmdb'
import { TYPE_LABEL } from '../lib/constants'
import SectionHead from '../components/SectionHead'
import SocialRow from '../components/SocialRow'

const TYPE_COLORS = { serie: 'var(--mauve)', anime: 'var(--gold)', cartone: 'var(--peach)' }

export default function PublicProfile() {
  const { username } = useParams()
  const [state, setState] = useState({ loading: true, profile: null, error: null })
  const [stats, setStats] = useState(null)
  const [favorites, setFavorites] = useState(null)

  useEffect(() => {
    let on = true
    setState({ loading: true, profile: null, error: null })
    setStats(null)
    setFavorites(null)

    async function load() {
      const { data: prof, error } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, bio, note, avatar_url, banner_url, social_tvtime, social_mal, social_imdb')
        .eq('username', username).eq('is_public', true).maybeSingle()
      if (!on) return
      if (error) { setState({ loading: false, profile: null, error: error.message }); return }
      setState({ loading: false, profile: prof ?? null, error: null })
      if (!prof) return

      supabase.rpc('get_public_stats', { p_username: username })
        .then(({ data }) => { if (on) setStats(data ?? null) })
      supabase.from('user_favorites').select('tmdb_id, title, poster_path')
        .eq('user_id', prof.id).order('position', { ascending: true }).limit(1000)
        .then(({ data }) => { if (on) setFavorites(data ?? []) })
    }
    load()
    return () => { on = false }
  }, [username])

  if (state.loading) {
    return <div className="splash"><span className="wordmark">MYTRACKLIST</span></div>
  }

  const p = state.profile
  const types = stats?.types ?? []
  const typeTotal = types.reduce((s, t) => s + t.n, 0)
  let acc = 0
  const pieStops = types.map((t) => {
    const from = (acc / typeTotal) * 100
    acc += t.n
    const to = (acc / typeTotal) * 100
    return `${TYPE_COLORS[t.t] ?? 'var(--surface2)'} ${from}% ${to}%`
  }).join(', ')
  const genres = stats?.genres ?? []
  const gMax = Math.max(1, ...genres.map((g) => g.n))

  return (
    <div className="page-wrap" style={{ paddingBottom: 40 }}>
      {state.error && (
        <div className="banner banner-error mt-16">
          <span className="banner-tag">ERR</span>
          <span className="banner-msg mono">{state.error}</span>
        </div>
      )}

      {!state.error && !p && (
        <div className="empty-state" style={{ marginTop: '30dvh' }}>
          <span className="overline">// 404</span>
          Profilo non trovato o non pubblico.
        </div>
      )}

      {p && (
        <>
          <div className="banner-img banner-lg" style={p.banner_url
            ? { backgroundImage: `url(${p.banner_url})` } : undefined} />

          <div className="detail-head" style={{ marginTop: -42 }}>
            <div className="avatar">
              {p.avatar_url
                ? <img src={p.avatar_url} alt="" />
                : (p.display_name || p.username).charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, paddingTop: 46 }}>
              <div className="detail-title" style={{ fontSize: 26 }}>{p.display_name || p.username}</div>
              <div className="mono text-sm" style={{ color: 'var(--mauve)' }}>@{p.username}</div>
            </div>
          </div>

          {p.bio && <p className="text-sm mt-8">{p.bio}</p>}
          {p.note && (
            <div className="card mt-8">
              <span className="overline">// note</span>
              <p className="text-sm text-sub mt-8" style={{ whiteSpace: 'pre-wrap' }}>{p.note}</p>
            </div>
          )}
          <div className="mt-8">
            <SocialRow tvtime={p.social_tvtime} imdb={p.social_imdb} mal={p.social_mal} />
          </div>

          {stats?.totals && (
            <div className="stat-tiles mt-16" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="stat-tile">
                <div className="stat-num">{stats.totals.hours}</div>
                <div className="stat-lab">ore</div>
              </div>
              <div className="stat-tile">
                <div className="stat-num">{stats.totals.shows}</div>
                <div className="stat-lab">serie</div>
              </div>
              <div className="stat-tile">
                <div className="stat-num">{stats.totals.completed}</div>
                <div className="stat-lab">completate</div>
              </div>
            </div>
          )}

          {favorites?.length > 0 && (
            <>
              <SectionHead title="PREFERITE" tag={`${favorites.length}`} />
              <div className="hstrip">
                {favorites.map((f) => (
                  <div key={f.tmdb_id} className="tile">
                    {f.poster_path
                      ? <img className="tile-poster" src={IMG(f.poster_path)} alt="" loading="lazy" />
                      : <div className="tile-poster poster-empty">{f.title.charAt(0)}</div>}
                    <div className="tile-title">{f.title}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {typeTotal > 0 && (
            <>
              <SectionHead title="TIPOLOGIE" />
              <div className="pie-row">
                <div className="pie-square" style={{ background: `conic-gradient(${pieStops})` }} />
                <div className="legend">
                  {types.map((t) => (
                    <div key={t.t} className="legend-item">
                      <span className="legend-dot" style={{ background: TYPE_COLORS[t.t] }} />
                      <span>{TYPE_LABEL[t.t] ?? t.t}</span>
                      <span className="mono text-sub">{t.n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {genres.length > 0 && (
            <>
              <SectionHead title="GENERI" tag="top 8" />
              <div className="stack-8">
                {genres.map((g) => (
                  <div key={g.g} className="bar-row">
                    <span className="bar-label">{g.g}</span>
                    <span className="bar-track"><i style={{ width: `${(g.n / gMax) * 100}%` }} /></span>
                    <span className="bar-num mono">{g.n}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {stats?.top_shows?.length > 0 && (
            <>
              <SectionHead title="MEGLIO VOTATE" tag="top 5" />
              <div className="stack-8">
                {stats.top_shows.map((s) => (
                  <div key={s.title} className="top-row">
                    {s.poster_path
                      ? <img className="top-poster" src={IMG(s.poster_path, 'w154')} alt="" loading="lazy" />
                      : <div className="top-poster poster-empty">{s.title.charAt(0)}</div>}
                    <span className="top-title">{s.title}</span>
                    <span className="chip chip-gold">★ {s.rating}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <Link to="/" className="wordmark" style={{ fontSize: 20 }}>MYTRACKLIST</Link>
      </div>
    </div>
  )
}
