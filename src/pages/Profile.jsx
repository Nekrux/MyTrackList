import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmButton from '../components/ConfirmButton'

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const toast = useToast()
  const [isPublic, setIsPublic] = useState(Boolean(profile?.is_public))
  const [saving, setSaving] = useState(false)

  const publicLink = `${window.location.origin}/u/${profile?.username ?? ''}`
  const initial = (profile?.display_name || profile?.username || '?').charAt(0).toUpperCase()

  async function togglePublic() {
    if (saving) return
    const next = !isPublic
    setIsPublic(next) // aggiornamento ottimistico
    setSaving(true)
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_public: next })
      .eq('id', user.id)
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

      <div className="card card-accent mt-16" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div className="avatar">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initial}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.04em', lineHeight: 1.1 }}>
            {profile?.display_name || profile?.username}
          </div>
          <div className="mono text-sm" style={{ color: 'var(--mauve)' }}>@{profile?.username}</div>
          <div className="text-sm text-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
        </div>
      </div>

      <div className="section-head">
        <h2>VISIBILITÀ</h2>
        <span className="rule" />
      </div>

      <div className="profile-row">
        <div>
          <div className="row-label">Profilo pubblico</div>
          <div className="row-sub">Statistiche visibili senza login su /u/{profile?.username}</div>
        </div>
        <button
          type="button"
          className={`switch${isPublic ? ' on' : ''}`}
          role="switch"
          aria-checked={isPublic}
          aria-label="Profilo pubblico"
          onClick={togglePublic}
        />
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

      <div className="section-head">
        <h2>PREFERITE</h2>
        <span className="rule" />
        <span className="tag">fase 2</span>
      </div>
      <div className="empty-state">
        <span className="overline">// vuoto</span>
        Le tue serie preferite compariranno qui, senza limite.
      </div>

      <div className="section-head">
        <h2>STATISTICHE</h2>
        <span className="rule" />
        <span className="tag">fase 2</span>
      </div>
      <div className="empty-state">
        <span className="overline">// in costruzione</span>
        Ore totali, grafici e istogrammi voti arrivano con la Fase 2.
      </div>

      <div className="section-head">
        <h2>IMPORT TVTIME</h2>
        <span className="rule" />
        <span className="tag">fase 4</span>
      </div>
      <div className="empty-state">
        <span className="overline">// in attesa</span>
        L'import dell'export GDPR (con dry-run) arriva con la Fase 4.
      </div>

      <div className="mt-24">
        <ConfirmButton
          label="Esci"
          confirmLabel="Conferma uscita"
          className="btn btn-block"
          armedClassName="btn btn-danger btn-block"
          onConfirm={handleSignOut}
        />
      </div>
    </>
  )
}
