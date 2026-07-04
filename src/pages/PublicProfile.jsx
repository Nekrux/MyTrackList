import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader, Empty, Poster } from '../components/ui'
import StatsPanel from '../components/StatsPanel'
import { SocialIcon } from '../components/SocialIcon'
import { computeStats } from '../lib/stats'

export default function PublicProfile() {
  const { username } = useParams()
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [data, setData] = useState({ shows: [], episodes: [], seasons: [], favs: [] })
  const [tab, setTab] = useState('preferite')

  useEffect(() => {
    let on = true
    ;(async () => {
      setLoading(true)
      const { data: prof } = await supabase.from('user_profiles').select('*').eq('username', username).eq('is_public', true).maybeSingle()
      if (!on) return
      if (!prof) { setNotFound(true); setLoading(false); return }
      setProfile(prof)
      const [shows, eps, seas, favs] = await Promise.all([
        supabase.from('user_shows').select('*').eq('user_id', prof.id),
        supabase.from('user_episodes').select('*').eq('user_id', prof.id),
        supabase.from('season_tracking').select('*').eq('user_id', prof.id),
        supabase.from('user_favorites').select('*').eq('user_id', prof.id).order('position'),
      ])
      setData({ shows: shows.data || [], episodes: eps.data || [], seasons: seas.data || [], favs: favs.data || [] })
      setLoading(false)
    })()
    return () => { on = false }
  }, [username])

  if (loading) return <div className="app-shell"><Loader /></div>
  if (notFound) return (
    <div className="app-shell" style={{ paddingBottom: 0 }}>
      <div className="page page-pad-top">
        <Empty title="Profilo non disponibile">Questo profilo non esiste o è privato.</Empty>
        <button className="btn btn-primary btn-block" onClick={() => nav('/')}>Vai a MyTrackList</button>
      </div>
    </div>
  )

  const stats = computeStats(data.shows, data.episodes, [], data.seasons)
  const completate = data.shows.filter(s => s.status === 'completata').length

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', minHeight: '100vh', paddingBottom: 40 }}>
      <div className="ppf-banner" style={{ height: 170 }}>
        {profile.banner_url ? <img src={profile.banner_url} alt="" /> : <div className="ppf-banner-grad" />}
      </div>

      <div className="page" style={{ paddingTop: 0, marginTop: -44, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 12 }}>
          <div className="ppf-avatar">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <div className="ppf-avatar-ph">{(profile.display_name || profile.username)[0]?.toUpperCase()}</div>}
          </div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1 style={{ fontSize: 26, lineHeight: 1 }}>{profile.display_name || profile.username}</h1>
            <div className="muted" style={{ fontSize: 13 }}>@{profile.username}</div>
          </div>
        </div>

        {profile.bio && <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>{profile.bio}</p>}
        {profile.note && <p className="subtext" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>{profile.note}</p>}

        {(profile.social_tvtime || profile.social_mal || profile.social_imdb) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {profile.social_tvtime && <a href={profile.social_tvtime} target="_blank" rel="noreferrer" className="soc"><SocialIcon kind="tvtime" /></a>}
            {profile.social_mal && <a href={profile.social_mal} target="_blank" rel="noreferrer" className="soc"><SocialIcon kind="mal" /></a>}
            {profile.social_imdb && <a href={profile.social_imdb} target="_blank" rel="noreferrer" className="soc"><SocialIcon kind="imdb" /></a>}
          </div>
        )}

        {/* Strip riepilogo */}
        <div className="ppf-strip">
          <div><b>{stats.oreTotali}</b><span>ore</span></div>
          <div><b>{stats.serieTotali}</b><span>serie</span></div>
          <div><b>{completate}</b><span>completate</span></div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--surface1)', margin: '6px 0 14px' }}>
          <button className={'pf-tab' + (tab === 'preferite' ? ' on' : '')} onClick={() => setTab('preferite')}>Preferite</button>
          <button className={'pf-tab' + (tab === 'stats' ? ' on' : '')} onClick={() => setTab('stats')}>Statistiche</button>
        </div>

        {tab === 'preferite' ? (
          data.favs.length === 0 ? <Empty title="Nessuna preferita" /> : (
            <div className="fav-grid">
              {data.favs.slice(0, 6).map(fav => (
                <div key={fav.tmdb_id} className="fav-cell" onClick={() => nav(`/show/${fav.tmdb_id}`)}>
                  <Poster path={fav.poster_path} alt={fav.title} width={'100%'} />
                </div>
              ))}
            </div>
          )
        ) : (
          <StatsPanel shows={data.shows} episodes={data.episodes} details={[]} seasons={data.seasons} variant="public" />
        )}

        <div className="ppf-footer">
          <span style={{ background: 'var(--grad-word)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>MYTRACKLIST</span>
        </div>
      </div>

      <style>{`
        .ppf-banner { position: relative; overflow: hidden; background: var(--surface0); }
        .ppf-banner img { width: 100%; height: 100%; object-fit: cover; }
        .ppf-banner-grad { width: 100%; height: 100%; background: linear-gradient(120deg, var(--mauve-deep), var(--surface0) 60%, var(--pink)); opacity: .5; }
        .ppf-avatar { width: 88px; height: 88px; flex: 0 0 88px; border: 3px solid var(--gold); overflow: hidden; background: var(--surface1); }
        .ppf-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .ppf-avatar-ph { width: 100%; height: 100%; display: grid; place-items: center; font-family: var(--f-display); font-size: 40px; color: var(--mauve); }
        .soc { width: 40px; height: 40px; display: grid; place-items: center; background: var(--surface0); border: 1px solid var(--surface1); }
        .ppf-strip { display: flex; background: var(--surface0); border: 1px solid var(--surface1); margin-bottom: 14px; }
        .ppf-strip > div { flex: 1; text-align: center; padding: 12px 6px; border-right: 1px solid var(--surface1); }
        .ppf-strip > div:last-child { border-right: none; }
        .ppf-strip b { font-family: var(--f-display); font-size: 26px; color: var(--mauve); display: block; letter-spacing: .02em; }
        .ppf-strip span { font-size: 11px; color: var(--subtext); }
        .pf-tab { flex: 1; padding: 10px; font-weight: 600; font-size: 14px; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .pf-tab.on { color: var(--mauve); border-bottom-color: var(--mauve); }
        .fav-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .fav-cell { cursor: pointer; }
        .ppf-footer { text-align: center; margin-top: 30px; font-family: var(--f-display); font-size: 22px; letter-spacing: .1em; opacity: .8; }
      `}</style>
    </div>
  )
}
