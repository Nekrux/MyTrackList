import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { STATUSES, TYPES, GENRES } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import ShowCard from '../components/ShowCard'

const STATUS_TABS = [{ id: 'tutto', label: 'Tutto' }, ...STATUSES]
const TYPE_TABS = [{ id: 'tutti', label: 'Tutti' }, ...TYPES]

export default function Library() {
  const { user } = useAuth()
  const [shows, setShows] = useState(null)
  const [progress, setProgress] = useState({})
  const [favs, setFavs] = useState(new Set())
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('tutto')
  const [type, setType] = useState('tutti')
  const [genre, setGenre] = useState(null)

  useEffect(() => {
    let on = true
    async function load() {
      const [s, p, f] = await Promise.all([
        supabase.from('user_shows').select('*').eq('user_id', user.id)
          .order('updated_at', { ascending: false }).limit(1000),
        supabase.from('v_show_progress').select('*').eq('user_id', user.id).limit(1000),
        supabase.from('user_favorites').select('tmdb_id').eq('user_id', user.id).limit(1000),
      ])
      if (!on) return
      const err = s.error || p.error || f.error
      if (err) { setError(err.message); return }
      setShows(s.data ?? [])
      setProgress(Object.fromEntries((p.data ?? []).map((r) => [r.tmdb_show_id, r.watched])))
      setFavs(new Set((f.data ?? []).map((r) => r.tmdb_id)))
    }
    load()
    return () => { on = false }
  }, [user.id])

  const filtered = useMemo(() => {
    if (!shows) return null
    return shows.filter((s) => {
      if (status !== 'tutto' && s.status !== status) return false
      if (type !== 'tutti' && s.media_type !== type) return false
      if (genre) {
        try {
          if (!JSON.parse(s.genres ?? '[]').includes(genre)) return false
        } catch { return false }
      }
      return true
    })
  }, [shows, status, type, genre])

  function setFav(tmdbId, on) {
    setFavs((cur) => {
      const next = new Set(cur)
      on ? next.add(tmdbId) : next.delete(tmdbId)
      return next
    })
  }

  return (
    <>
      <h1 className="page-title">LIBRERIA</h1>

      {error && (
        <div className="banner banner-error mt-16">
          <span className="banner-tag">ERR</span>
          <span className="banner-msg mono">{error}</span>
        </div>
      )}

      <div className="tabs-scroll mt-16">
        {STATUS_TABS.map((t) => (
          <button key={t.id} type="button"
            className={`tab${status === t.id ? ' active' : ''}`}
            onClick={() => setStatus(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="chips mt-8">
        {TYPE_TABS.map((t) => (
          <button key={t.id} type="button"
            className={`chip-btn${type === t.id ? ' on' : ''}`}
            onClick={() => setType(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="chips mt-8">
        {GENRES.map((g) => (
          <button key={g.id} type="button"
            className={`chip-btn${genre === g.name ? ' on' : ''}`}
            onClick={() => setGenre(genre === g.name ? null : g.name)}>
            {g.name}
          </button>
        ))}
      </div>

      {filtered?.length === 0 && (
        <div className="empty-state mt-16">
          <span className="overline">// vuoto</span>
          {shows?.length === 0
            ? 'La libreria è vuota: aggiungi una serie dalla ricerca.'
            : 'Nessuna serie con questi filtri.'}
        </div>
      )}

      {filtered?.length > 0 && (
        <div className="poster-grid mt-16">
          {filtered.map((s) => (
            <ShowCard
              key={s.tmdb_id}
              show={s}
              watched={progress[s.tmdb_id] ?? 0}
              isFav={favs.has(s.tmdb_id)}
              onFav={(on) => setFav(s.tmdb_id, on)}
            />
          ))}
        </div>
      )}
    </>
  )
}
