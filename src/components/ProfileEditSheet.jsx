import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function ProfileEditSheet({ open, onClose }) {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  const [f, setF] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setF({
      display_name: profile?.display_name ?? '',
      bio: profile?.bio ?? '',
      note: profile?.note ?? '',
      avatar_url: profile?.avatar_url ?? '',
      banner_url: profile?.banner_url ?? '',
      social_tvtime: profile?.social_tvtime ?? '',
      social_imdb: profile?.social_imdb ?? '',
      social_mal: profile?.social_mal ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (k) => (e) => setF((cur) => ({ ...cur, [k]: e.target.value }))

  async function save() {
    setSaving(true)
    const patch = Object.fromEntries(
      Object.entries(f).map(([k, v]) => [k, v.trim() || null])
    )
    if (!patch.display_name) patch.display_name = profile.username
    const { error } = await supabase.from('user_profiles').update(patch).eq('id', user.id)
    setSaving(false)
    if (error) { toast.error(`Salvataggio profilo: ${error.message}`); return }
    toast.success('Profilo aggiornato')
    await refreshProfile()
    onClose()
  }

  const field = (key, label, props = {}) => (
    <div className="field">
      <label className="label" htmlFor={`pf-${key}`}>{label}</label>
      <input id={`pf-${key}`} className="input" type="text"
        value={f[key] ?? ''} onChange={set(key)} {...props} />
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} title="Modifica profilo">
      {field('display_name', 'Nome visualizzato', { maxLength: 50 })}

      <div className="field">
        <label className="label" htmlFor="pf-bio">Bio ({(f.bio ?? '').length}/300)</label>
        <textarea id="pf-bio" className="input" rows={3} maxLength={300}
          value={f.bio ?? ''} onChange={set('bio')} />
      </div>

      <div className="field">
        <label className="label" htmlFor="pf-note">Note ({(f.note ?? '').length}/500)</label>
        <textarea id="pf-note" className="input" rows={4} maxLength={500}
          value={f.note ?? ''} onChange={set('note')} />
      </div>

      {field('avatar_url', 'URL immagine profilo', { placeholder: 'https://…', inputMode: 'url' })}
      {field('banner_url', 'URL banner', { placeholder: 'https://…', inputMode: 'url' })}
      {field('social_tvtime', 'Link TVTime', { placeholder: 'https://tvtime.com/…', inputMode: 'url' })}
      {field('social_imdb', 'Link IMDb', { placeholder: 'https://imdb.com/…', inputMode: 'url' })}
      {field('social_mal', 'Link MyAnimeList', { placeholder: 'https://myanimelist.net/…', inputMode: 'url' })}

      <button type="button" className="btn btn-primary btn-block" disabled={saving} onClick={save}>
        {saving ? 'Attendi…' : 'Salva'}
      </button>
    </Sheet>
  )
}
