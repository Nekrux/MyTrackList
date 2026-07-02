import { useNavigate } from 'react-router-dom'
import { imgUrl } from '../lib/tmdb'

const STATUS_LABELS = { watching:'In corso', completed:'Completata', plan_to_watch:'Da vedere', dropped:'Abbandonata', paused:'In pausa' }
const TYPE_LABELS   = { tv:'TV', anime:'Anime', cartoon:'Cartone' }

export default function ShowCard({ show, watchedCount, isFav, onFavToggle }) {
  const nav    = useNavigate()
  const poster = imgUrl(show.poster_path, 'w185')
  const watched = watchedCount ?? 0
  const total   = show.total_episodes ?? 0
  const pct     = total > 0 ? Math.round(watched/total*100) : 0

  return (
    <button className="show-card" onClick={() => nav(`/show/${show.tmdb_id}`)}>
      <div className="show-card-poster">
        {poster ? <img src={poster} alt={show.title} loading="lazy" /> : <span>—</span>}
      </div>
      <div className="show-card-info">
        <div className="show-card-title">{show.title}</div>
        <div className="show-card-meta">
          {show.first_air_year || '—'}
          {show.original_title && show.original_title !== show.title ? ` · ${show.original_title}` : ''}
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:6 }}>
          <span className={`badge badge-${show.status}`}>{STATUS_LABELS[show.status]||show.status}</span>
          <span className={`badge badge-${show.media_type}`}>{TYPE_LABELS[show.media_type]||show.media_type}</span>
          {show.rating && <span className="badge" style={{ background:'var(--gold-dim)', color:'var(--gold)' }}>★ {show.rating}/10</span>}
          {isFav && <span className="badge badge-fav">★ Preferita</span>}
        </div>
        {total > 0 && (
          <div>
            <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3 }}>{watched}/{total} ep · {pct}%</div>
            <div className="progress-bar"><div className="progress-fill" style={{ width:`${pct}%` }} /></div>
          </div>
        )}
      </div>
      {onFavToggle && (
        <button
          onClick={e => { e.stopPropagation(); onFavToggle(show) }}
          style={{ background:'none', fontSize:20, color: isFav ? 'var(--gold)' : 'var(--surface2)', padding:'0 4px', flexShrink:0 }}
          title={isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
        >★</button>
      )}
    </button>
  )
}
