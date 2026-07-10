import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IMG } from '../lib/tmdb'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import SectionHead from '../components/SectionHead'
import ConfirmButton from '../components/ConfirmButton'
import ProfileEditSheet from '../components/ProfileEditSheet'
import SocialRow from '../components/SocialRow'

const Stats = lazy(() => import('./Stats'))

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('profilo')
  const [isPublic, setIsPublic] = useState(Boolean(profile?.is_public))
  const [saving, setSaving] = useState(false)
  const [favorites, setFavorites] = useState(null)
  const [editOpen, setEditOpen] = useState(false)

  const publicLink = `${window.location.origin}/u/${profile?.username ?? ''}`
  const initial = (profile?.display_name || profile?.username || '?').charAt(0).toUpperCase()

  useEffect(() => {
    let on = true
    supabase.from('user_favorites').select('*').eq('user_id', user.id)
      .order('position', { ascending: true }).limit(1000)
      .then(({ data, error }) => {
        if (!on) return
        if (error) { toast.error(`Preferite: ${error.message}`); return }
        setFavorites(data ?? [])
      })
    return () => { on = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  async function togglePublic() {
    if (saving) return
    const next = !isPublic
    setIsPublic(next)
    setSaving(true)
    const { error } = await supabase.from('user_profiles')
      .update({ is_public: next }).eq('id', user.id)
    setSaving(false)
    if (error) {
      setIsPublic(!next)
      toast.error(`Salvataggio non riuscito: ${error.message}`)
      return
    }
    toast.success(next ? 'Profilo pubblico attivo' : 'Profilo ora privato')
    refreshProfile()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicLink)
      toast.success('Link copiato')
    } catch (err) {
      toast.error(`Copia non riuscita: ${err.message}`)
    }
  }

  async function handleSignOut() {
    const error = await signOut()
    if (error) toast.error(`Uscita non riuscita: ${error.message}`)
  }

  return (
    <>
      <h1 className="page-title">PROFILO</h1>

      <div className="tabs mt-16">
        <button type="button" className={`tab${tab === 'profilo' ? ' active' : ''}`}
          onClick={() => setTab('profilo')}>Profilo</button>
        <button type="button" className={`tab${tab === 'stats' ? ' active' : ''}`}
          onClick={() => setTab('stats')}>Statistiche</button>
      </div>

      {tab === 'stats' && (
        <Suspense fallback={<p className="overline mt-16">// caricamento statistiche…</p>}>
          <Stats />
        </Suspense>
      )}

      {tab === 'profilo' && (
        <>
          <div className="banner-img mt-16" style={profile?.banner_url
            ? { backgroundImage: `url(${profile.banner_url})` } : undefined} />

          <div className="detail-head" style={{ marginTop: -42 }}>
            <div className="avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initial}
            </div>
            <div style={{ minWidth: 0, paddingTop: 46 }}>
              <div className="detail-title" style={{ fontSize: 26 }}>
                {profile?.display_name || profile?.username}
              </div>
              <div className="mono text-sm" style={{ color: 'var(--mauve)' }}>@{profile?.username}</div>
            </div>
          </div>

          {profile?.bio && <p className="text-sm mt-8">{profile.bio}</p>}
          {profile?.note && (
            <div className="card mt-8">
              <span className="overline">// note</span>
              <p className="text-sm text-sub mt-8" style={{ whiteSpace: 'pre-wrap' }}>{profile.note}</p>
            </div>
          )}

          <div className="detail-actions mt-16">
            <button type="button" className="btn btn-sm" onClick={() => setEditOpen(true)}>
              Modifica profilo
            </button>
            <SocialRow tvtime={profile?.social_tvtime} imdb={profile?.social_imdb} mal={profile?.social_mal} />
          </div>

          <SectionHead title="VISIBILITÀ" />
          <div className="profile-row">
            <div>
              <div className="row-label">Profilo pubblico</div>
              <div className="row-sub">Visibile senza login su /u/{profile?.username}</div>
            </div>
            <button type="button" className={`switch${isPublic ? ' on' : ''}`} role="switch"
              aria-checked={isPublic} aria-label="Profilo pubblico" onClick={togglePublic} />
          </div>
          <div className="profile-row">
            <div style={{ minWidth: 0 }}>
              <div className="row-label">Link pubblico</div>
              <div className="row-sub mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {publicLink}
              </div>
            </div>
            <button type="button" className="btn btn-sm" onClick={copyLink}>Copia</button>
          </div>

          <SectionHead title="PREFERITE" tag={favorites ? `${favorites.length}` : '…'} />
          {favorites?.length === 0 && (
            <div className="empty-state">
              <span className="overline">// vuoto</span>
              Tocca la stella su una serie per aggiungerla qui. Nessun limite.
            </div>
          )}
          {favorites?.length > 0 && (
            <div className="hstrip">
              {favorites.map((f) => (
                <Link key={f.tmdb_id} to={`/serie/${f.tmdb_id}`} className="tile">
                  {f.poster_path
                    ? <img className="tile-poster" src={IMG(f.poster_path)} alt="" loading="lazy" />
                    : <div className="tile-poster poster-empty">{f.title.charAt(0)}</div>}
                  <div className="tile-title">{f.title}</div>
                </Link>
              ))}
            </div>
          )}

          <SectionHead title="IMPORT TVTIME" tag="fase 4" />
          <Link to="/import" className="btn btn-block">Vai all'import</Link>

          <div className="mt-24">
            <ConfirmButton
              label="Esci"
              confirmLabel="Conferma uscita"
              className="btn btn-block"
              armedClassName="btn btn-danger btn-block"
              onConfirm={handleSignOut}
            />
          </div>

          <ProfileEditSheet open={editOpen} onClose={() => setEditOpen(false)} />
        </>
      )}
    </>
  )
}
