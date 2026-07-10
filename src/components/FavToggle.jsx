import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

// Toggle preferita: stato derivato da user_favorites, aggiornamento ottimistico.
export default function FavToggle({ show, isFav, onChange, className = '' }) {
  const { user } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    const next = !isFav
    onChange(next) // ottimistico
    setBusy(true)
    let error
    if (next) {
      ({ error } = await supabase.from('user_favorites').upsert({
        user_id: user.id,
        tmdb_id: show.tmdb_id,
        title: show.title,
        poster_path: show.poster_path ?? null,
        position: Math.floor(Date.now() / 1000),
      }, { onConflict: 'user_id,tmdb_id' }))
    } else {
      ({ error } = await supabase.from('user_favorites')
        .delete()
        .match({ user_id: user.id, tmdb_id: show.tmdb_id }))
    }
    setBusy(false)
    if (error) {
      onChange(!next) // ripristino
      toast.error(`Preferite: ${error.message}`)
    }
  }

  return (
    <button
      type="button"
      className={`fav-btn${isFav ? ' on' : ''} ${className}`}
      aria-pressed={isFav}
      aria-label={isFav ? 'Rimuovi dalle preferite' : 'Aggiungi alle preferite'}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill={isFav ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="miter">
        <path d="M12 2.5l2.9 6.2 6.8.8-5 4.6 1.3 6.7-6-3.4-6 3.4 1.3-6.7-5-4.6 6.8-.8z" />
      </svg>
    </button>
  )
}
