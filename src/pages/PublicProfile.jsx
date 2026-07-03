import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { posterUrl } from '../lib/tmdb'
import { computeStats } from '../lib/stats'
import StatsCharts from '../components/StatsCharts'
import Spinner from '../components/Spinner'

export default function PublicProfile() {
  const { username } = useParams()
  const [profile, setProfile] = useState(undefined)
  const [favorites, setFavorites] = useState([])
  const [stats, setStats] = useState(null)
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('username', username)
        .eq('is_public', true)
        .maybeSingle()

      if (cancelled) return
      setProfile(profileData || null)
      if (!profileData) return

      const [{ data: favs }, { data: shows }] = await Promise.all([
        supabase.from('user_favorites').select('*').eq('user_id', profileData.id).order('position'),
        supabase.from('user_shows').select('*').eq('user_id', profileData.id)
      ])
      if (cancelled) return
      setFavorites(favs || [])
      setStats(computeStats({ shows: shows || [], episodes: [], episodeDetails: [] }))
    }
    load()
    return () => { cancelled = true }
  }, [username])

  if (profile === undefined) return <Spinner label="Caricamento profilo..." />

  if (profile === null) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>Profilo non trovato</h3>
          <p>Questo profilo non esiste oppure è privato.</p>
        </div>
      </div>
    )
  }

  const completedCount = stats?.statusData?.find(s => s.value === 'completed')?.count ?? 0

  return (
    <div className="page" style={{ padding: 0, paddingBottom: 40 }}>
      <div style={{ height: 140, background: 'var(--surface)', overflow: 'hidden' }}>
        {profile.banner_url && <img src={profile.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -42, marginBottom: 12 }}>
          <div className="gold-border" style={{ width: 84, height: 84, overflow: 'hidden', background: 'var(--surface)' }}>
            {profile.avatar_url && <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 24 }}>{profile.display_name || profile.username}</h1>
          <div style={{ fontSize: 13, color: 'var(--subtext)' }}>@{profile.username}</div>
          {profile.bio && <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text)' }}>{profile.bio}</p>}
          {profile.note && <p style={{ fontSize: 12, marginTop: 4, color: 'var(--subtext)', fontStyle: 'italic' }}>{profile.note}</p>}

          {(profile.social_tvtime || profile.social_mal || profile.social_imdb) && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              {profile.social_tvtime && <a href={profile.social_tvtime} target="_blank" rel="noreferrer" className="chip">TVTime</a>}
              {profile.social_mal && <a href={profile.social_mal} target="_blank" rel="noreferrer" className="chip">MyAnimeList</a>}
              {profile.social_imdb && <a href={profile.social_imdb} target="_blank" rel="noreferrer" className="chip">IMDb</a>}
            </div>
          )}
        </div>

        {stats && (
          <div className="grid-2" style={{ marginBottom: 24 }}>
            <div className="card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--mauve)' }}>{stats.totalHours}h</div>
              <div style={{ fontSize: 10, color: 'var(--subtext)' }}>Ore</div>
            </div>
            <div className="card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--mauve)' }}>{stats.totalShows}</div>
              <div style={{ fontSize: 10, color: 'var(--subtext)' }}>Serie</div>
            </div>
            <div className="card" style={{ padding: 12, textAlign: 'center', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--mauve)' }}>{completedCount}</div>
              <div style={{ fontSize: 10, color: 'var(--subtext)' }}>Completate</div>
            </div>
          </div>
        )}

        {favorites.length > 0 && (
          <>
            <h2 className="section-title">Preferite</h2>
            <div className="grid-3x2" style={{ marginBottom: 24 }}>
              {favorites.map(f => (
                <div key={f.id} className="card">
                  <div style={{ aspectRatio: '2/3', overflow: 'hidden', background: 'var(--surface-hover)' }}>
                    {f.poster_path && <img src={posterUrl(f.poster_path)} alt={f.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn secondary block" onClick={() => setShowStats(s => !s)} style={{ marginBottom: 16 }}>
          {showStats ? 'Nascondi statistiche' : 'Mostra statistiche'}
        </button>

        {showStats && <StatsCharts stats={stats} variant="public" />}

        <div style={{ textAlign: 'center', marginTop: 32, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--overlay)', fontSize: 13 }}>
          MYTRACKLIST
        </div>
      </div>
    </div>
  )
}
