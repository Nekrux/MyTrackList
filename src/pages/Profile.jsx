import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { listShows, listFavorites, removeFavorite } from '../lib/db'
import { Loader, Sheet, Poster } from '../components/ui'
import StatsPanel from '../components/StatsPanel'
import { SocialIcon } from '../components/SocialIcon'

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [tab, setTab] = useState('profilo')
  const [favs, setFavs] = useState([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // dati statistiche
  const [statsData, setStatsData] = useState(null)

  // form
  const [f, setF] = useState({})

  useEffect(() => { listFavorites(user.id).then(setFavs).catch(() => {}) }, [user.id])
  useEffect(() => {
    setF({
      display_name: profile.display_name || '', bio: profile.bio || '', note: profile.note || '',
      avatar_url: profile.avatar_url || '', banner_url: profile.banner_url || '',
      social_tvtime: profile.social_tvtime || '', social_mal: profile.social_mal || '', social_imdb: profile.social_imdb || '',
    })
  }, [profile])

  const loadStats = async () => {
    if (statsData) return
    try {
      const [shows, eps, dets, seas] = await Promise.all([
        listShows(user.id),
        supabase.from('user_episodes').select('*').eq('user_id', user.id),
        supabase.from('episode_details').select('*').eq('user_id', user.id),
        supabase.from('season_tracking').select('*').eq('user_id', user.id),
      ])
      setStatsData({ shows, episodes: eps.data || [], details: dets.data || [], seasons: seas.data || [] })
    } catch (e) { toast.error(e.message) }
  }
  useEffect(() => { if (tab === 'stats') loadStats() }, [tab])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('user_profiles')
      .update({ ...f, updated_at: new Date().toISOString() }).eq('id', user.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Profilo aggiornato.')
    setEditing(false); refreshProfile()
  }

  const togglePublic = async () => {
    const { error } = await supabase.from('user_profiles').update({ is_public: !profile.is_public }).eq('id', user.id)
    if (error) return toast.error(error.message)
    toast.success(profile.is_public ? 'Profilo ora privato.' : 'Profilo ora pubblico.')
    refreshProfile()
  }

  const publicUrl = `${window.location.origin}/u/${profile.username}`
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(publicUrl); toast.success('Link copiato.') }
    catch { toast.info(publicUrl) }
  }

  const dropFav = async (tmdbId) => {
    try { await removeFavorite(user.id, tmdbId); setFavs(favs.filter(x => x.tmdb_id !== tmdbId)) }
    catch (e) { toast.error(e.message) }
  }

  if (!profile) return <Loader />

  return (
    <div>
      {/* Banner */}
      <div className="pf-banner" style={{ height: 160 }}>
        {profile.banner_url ? <img src={profile.banner_url} alt="" /> : <div className="pf-banner-grad" />}
      </div>

      <div className="page" style={{ paddingTop: 0, marginTop: -44, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 12 }}>
          <div className="pf-avatar">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <div className="pf-avatar-ph">{(profile.display_name || profile.username)[0]?.toUpperCase()}</div>}
          </div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1 style={{ fontSize: 26, lineHeight: 1 }}>{profile.display_name || profile.username}</h1>
            <div className="muted" style={{ fontSize: 13 }}>@{profile.username}</div>
          </div>
        </div>

        {profile.bio && <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>{profile.bio}</p>}
        {profile.note && <p className="subtext" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>{profile.note}</p>}

        {/* Social */}
        {(profile.social_tvtime || profile.social_mal || profile.social_imdb) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {profile.social_tvtime && <a href={profile.social_tvtime} target="_blank" rel="noreferrer" className="soc"><SocialIcon kind="tvtime" /></a>}
            {profile.social_mal && <a href={profile.social_mal} target="_blank" rel="noreferrer" className="soc"><SocialIcon kind="mal" /></a>}
            {profile.social_imdb && <a href={profile.social_imdb} target="_blank" rel="noreferrer" className="soc"><SocialIcon kind="imdb" /></a>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setEditing(true)}>✎ Modifica profilo</button>
          <button className={'btn' + (profile.is_public ? ' btn-primary' : '')} onClick={togglePublic}>
            {profile.is_public ? '🌐 Pubblico' : '🔒 Privato'}
          </button>
        </div>
        {profile.is_public && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</a>
            <button className="chip" onClick={copyLink}>Copia</button>
          </div>
        )}

        {/* Tab */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--surface1)', margin: '6px 0 14px' }}>
          <button className={'pf-tab' + (tab === 'profilo' ? ' on' : '')} onClick={() => setTab('profilo')}>Preferite</button>
          <button className={'pf-tab' + (tab === 'stats' ? ' on' : '')} onClick={() => setTab('stats')}>Statistiche</button>
        </div>

        {tab === 'profilo' ? (
          <>
            <div className="fav-grid">
              {Array.from({ length: 6 }, (_, i) => {
                const fav = favs[i]
                return fav ? (
                  <div key={fav.tmdb_id} className="fav-cell" onClick={() => nav(`/show/${fav.tmdb_id}`)}>
                    <Poster path={fav.poster_path} alt={fav.title} width={'100%'} />
                    <button className="fav-x" onClick={(e) => { e.stopPropagation(); dropFav(fav.tmdb_id) }}>✕</button>
                  </div>
                ) : (
                  <div key={'empty' + i} className="fav-empty">
                    <span>♦</span>
                  </div>
                )
              })}
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Tocca la stella su una serie per aggiungerla qui (max 6).</p>

            <div className="divider" />
            <button className="btn btn-ghost btn-block" onClick={() => nav('/import')} style={{ marginBottom: 10 }}>Importa da TVTime</button>
            <button className="btn btn-danger btn-block" onClick={signOut}>Esci</button>
          </>
        ) : (
          statsData ? <StatsPanel {...statsData} variant="full" /> : <Loader label="Calcolo statistiche…" />
        )}
      </div>

      {/* Edit sheet */}
      <Sheet open={editing} onClose={() => setEditing(false)} title="Modifica profilo">
        <label className="lbl">Nome visualizzato</label>
        <input className="field" value={f.display_name} onChange={e => setF({ ...f, display_name: e.target.value })} maxLength={60} />
        <label className="lbl">Bio ({(f.bio || '').length}/300)</label>
        <textarea className="field" rows={3} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value.slice(0, 300) })} />
        <label className="lbl">Note ({(f.note || '').length}/500)</label>
        <textarea className="field" rows={3} value={f.note} onChange={e => setF({ ...f, note: e.target.value.slice(0, 500) })} />
        <label className="lbl">URL immagine profilo</label>
        <input className="field" value={f.avatar_url} onChange={e => setF({ ...f, avatar_url: e.target.value })} placeholder="https://…" autoCapitalize="none" />
        <label className="lbl">URL banner</label>
        <input className="field" value={f.banner_url} onChange={e => setF({ ...f, banner_url: e.target.value })} placeholder="https://…" autoCapitalize="none" />
        <label className="lbl">Link TVTime</label>
        <input className="field" value={f.social_tvtime} onChange={e => setF({ ...f, social_tvtime: e.target.value })} placeholder="https://www.tvtime.com/user/…" autoCapitalize="none" />
        <label className="lbl">Link MyAnimeList</label>
        <input className="field" value={f.social_mal} onChange={e => setF({ ...f, social_mal: e.target.value })} placeholder="https://myanimelist.net/profile/…" autoCapitalize="none" />
        <label className="lbl">Link IMDb</label>
        <input className="field" value={f.social_imdb} onChange={e => setF({ ...f, social_imdb: e.target.value })} placeholder="https://www.imdb.com/user/…" autoCapitalize="none" />
        <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={saving} onClick={save}>{saving ? 'Salvo…' : 'Salva'}</button>
      </Sheet>

      <style>{`
        .pf-banner { position: relative; overflow: hidden; background: var(--surface0); }
        .pf-banner img { width: 100%; height: 100%; object-fit: cover; }
        .pf-banner-grad { width: 100%; height: 100%; background: linear-gradient(120deg, var(--mauve-deep), var(--surface0) 60%, var(--pink)); opacity: .5; }
        .pf-avatar { width: 88px; height: 88px; flex: 0 0 88px; border: 3px solid var(--gold); overflow: hidden; background: var(--surface1); }
        .pf-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .pf-avatar-ph { width: 100%; height: 100%; display: grid; place-items: center; font-family: var(--f-display); font-size: 40px; color: var(--mauve); }
        .soc { width: 40px; height: 40px; display: grid; place-items: center; background: var(--surface0); border: 1px solid var(--surface1); }
        .pf-tab { flex: 1; padding: 10px; font-weight: 600; font-size: 14px; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .pf-tab.on { color: var(--mauve); border-bottom-color: var(--mauve); }
        .fav-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .fav-cell { position: relative; cursor: pointer; }
        .fav-x { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: rgba(17,17,27,.8); color: #fff; font-size: 11px; }
        .fav-empty { aspect-ratio: 2/3; border: 1px dashed var(--surface1); display: grid; place-items: center; color: var(--surface2); font-size: 24px; }
      `}</style>
    </div>
  )
}
