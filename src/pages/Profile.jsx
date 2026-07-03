import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { posterUrl } from '../lib/tmdb'
import { computeStats } from '../lib/stats'
import StatsCharts from '../components/StatsCharts'
import Spinner from '../components/Spinner'

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState('profilo')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [favSearch, setFavSearch] = useState('')
  const [libraryShows, setLibraryShows] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setForm(profile || {
      username: '', display_name: '', bio: '', note: '', avatar_url: '', banner_url: '',
      is_public: true, social_tvtime: '', social_mal: '', social_imdb: ''
    })
  }, [profile])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [{ data: favs }, { data: shows }, { data: episodes }, { data: episodeDetails }, { data: seasonTracking }] = await Promise.all([
          supabase.from('user_favorites').select('*').eq('user_id', user.id).order('position'),
          supabase.from('user_shows').select('*').eq('user_id', user.id),
          supabase.from('user_episodes').select('*').eq('user_id', user.id),
          supabase.from('episode_details').select('*').eq('user_id', user.id),
          supabase.from('season_tracking').select('*').eq('user_id', user.id)
        ])
        if (cancelled) return
        setFavorites(favs || [])
        setLibraryShows(shows || [])
        setStats(computeStats({
          shows: shows || [], episodes: episodes || [], episodeDetails: episodeDetails || [],
          seasonTracking: seasonTracking || []
        }))
      } catch (err) {
        console.error('Errore caricamento profilo:', err)
        showToast('Errore nel caricamento dei dati del profilo.', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!form.username.trim()) { showToast('Lo username è obbligatorio.', 'info'); return }
    setSaving(true)
    const { error } = await supabase.from('user_profiles').upsert({
      id: user.id,
      username: form.username.trim(),
      display_name: form.display_name || null,
      bio: form.bio || null,
      note: form.note || null,
      avatar_url: form.avatar_url || null,
      banner_url: form.banner_url || null,
      is_public: form.is_public,
      social_tvtime: form.social_tvtime || null,
      social_mal: form.social_mal || null,
      social_imdb: form.social_imdb || null,
      updated_at: new Date().toISOString()
    })
    setSaving(false)
    if (error) {
      showToast(error.message.includes('duplicate') ? 'Questo username è già in uso.' : `Errore nel salvataggio: ${error.message}`, 'error')
      return
    }
    showToast('Profilo salvato', 'success')
    await refreshProfile()
  }

  async function removeFavorite(tmdbId) {
    try {
      const { error } = await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('tmdb_id', tmdbId)
      if (error) throw error
      setFavorites(prev => prev.filter(f => f.tmdb_id !== tmdbId))
    } catch (err) {
      showToast('Errore nella rimozione del preferito.', 'error')
    }
  }

  async function addFavorite(show) {
    if (favorites.length >= 6) { showToast('Massimo 6 serie preferite.', 'info'); return }
    if (favorites.some(f => f.tmdb_id === show.tmdb_id)) return
    try {
      const { data, error } = await supabase.from('user_favorites').insert({
        user_id: user.id, tmdb_id: show.tmdb_id, title: show.title, poster_path: show.poster_path, position: favorites.length
      }).select().single()
      if (error) throw error
      setFavorites(prev => [...prev, data])
      setFavSearch('')
    } catch (err) {
      showToast('Errore nell\'aggiunta ai preferiti.', 'error')
    }
  }

  function copyPublicLink() {
    const url = `${window.location.origin}/u/${form.username}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!form || loading) return <Spinner label="Caricamento profilo..." />

  const filteredLibrary = libraryShows.filter(s =>
    favSearch.trim() && s.title.toLowerCase().includes(favSearch.toLowerCase()) && !favorites.some(f => f.tmdb_id === s.tmdb_id)
  ).slice(0, 6)

  return (
    <div className="page">
      <div className="eyebrow">MyTrackList</div>
      <h1 style={{ fontSize: 30, marginBottom: 16 }}>Profilo</h1>

      <div className="chip-row" style={{ marginBottom: 20 }}>
        <button className={`chip ${tab === 'profilo' ? 'active' : ''}`} onClick={() => setTab('profilo')}>Profilo</button>
        <button className={`chip ${tab === 'statistiche' ? 'active' : ''}`} onClick={() => setTab('statistiche')}>Statistiche</button>
      </div>

      {tab === 'profilo' && (
        <>
          {form.banner_url && (
            <div style={{ height: 120, background: 'var(--surface)', overflow: 'hidden', marginBottom: -32 }}>
              <img src={form.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div className="gold-border" style={{ width: 84, height: 84, overflow: 'hidden', background: 'var(--surface)' }}>
              {form.avatar_url && <img src={form.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="grid-2">
              <div className="field">
                <label>Username</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })} required />
              </div>
              <div className="field">
                <label>Nome visualizzato</label>
                <input value={form.display_name || ''} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Bio (max 300 caratteri)</label>
              <textarea rows={2} maxLength={300} value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            <div className="field">
              <label>Nota profilo (max 500 caratteri)</label>
              <textarea rows={2} maxLength={500} value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>URL foto profilo</label>
                <input value={form.avatar_url || ''} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="field">
                <label>URL banner</label>
                <input value={form.banner_url || ''} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>

            <div className="field">
              <label>Link social</label>
              <input value={form.social_tvtime || ''} onChange={(e) => setForm({ ...form, social_tvtime: e.target.value })} placeholder="TVTime URL" style={{ marginBottom: 8 }} />
              <input value={form.social_mal || ''} onChange={(e) => setForm({ ...form, social_mal: e.target.value })} placeholder="MyAnimeList URL" style={{ marginBottom: 8 }} />
              <input value={form.social_imdb || ''} onChange={(e) => setForm({ ...form, social_imdb: e.target.value })} placeholder="IMDb URL" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Profilo pubblico</span>
              <button type="button" className={form.is_public ? 'btn' : 'btn secondary'} onClick={() => setForm({ ...form, is_public: !form.is_public })}>
                {form.is_public ? 'Pubblico' : 'Privato'}
              </button>
            </div>

            {profile?.username && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <div className="card" style={{ flex: 1, padding: 10, fontSize: 12, color: 'var(--subtext)', display: 'flex', alignItems: 'center' }}>
                  /u/{profile.username}
                </div>
                <button type="button" className="btn secondary" onClick={copyPublicLink}>{copied ? 'Copiato!' : 'Copia'}</button>
              </div>
            )}

            <button className="btn block" type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva profilo'}</button>
          </form>

          <h2 className="section-title" style={{ marginTop: 32 }}>Serie preferite ({favorites.length}/6)</h2>
          <div className="grid-3x2" style={{ marginBottom: 12 }}>
            {favorites.map(f => (
              <div key={f.id} className="card" style={{ position: 'relative' }}>
                <div style={{ aspectRatio: '2/3', overflow: 'hidden', background: 'var(--surface-hover)' }}>
                  {f.poster_path && <img src={posterUrl(f.poster_path)} alt={f.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <button onClick={() => removeFavorite(f.tmdb_id)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(30,30,46,0.8)', color: 'var(--red)', width: 22, height: 22, fontSize: 12 }}>✕</button>
              </div>
            ))}
            {Array.from({ length: Math.max(0, 6 - favorites.length) }).map((_, i) => (
              <div key={i} style={{ aspectRatio: '2/3', border: '1px dashed var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--overlay)', fontSize: 24 }}>+</div>
            ))}
          </div>
          {favorites.length < 6 && (
            <div className="field">
              <label>Cerca nella tua libreria per aggiungere ai preferiti</label>
              <input value={favSearch} onChange={(e) => setFavSearch(e.target.value)} placeholder="Titolo serie..." />
              {filteredLibrary.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {filteredLibrary.map(s => (
                    <button key={s.tmdb_id} onClick={() => addFavorite(s)} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, textAlign: 'left' }}>
                      <span style={{ fontSize: 13, flex: 1 }}>{s.title}</span>
                      <span style={{ color: 'var(--gold)' }}>+</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/profilo/import" className="btn secondary block" style={{ textAlign: 'center' }}>Importa da TVTime</Link>
            <button className="btn danger" onClick={signOut}>Esci</button>
          </div>
        </>
      )}

      {tab === 'statistiche' && <StatsCharts stats={stats} variant="full" />}
    </div>
  )
}
