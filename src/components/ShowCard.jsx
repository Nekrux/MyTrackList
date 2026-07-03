import { Link } from 'react-router-dom'
import { posterUrl, MEDIA_TYPES, STATUSES } from '../lib/tmdb'

const STATUS_LABEL = Object.fromEntries(STATUSES.map(s => [s.value, s.label]))
const TYPE_LABEL = Object.fromEntries(MEDIA_TYPES.map(t => [t.value, t.label]))

export default function ShowCard({ show, watchedEpisodes = 0, isFavorite, onToggleFavorite }) {
  const totalEp = show.total_episodes || 0
  const progress = totalEp > 0 ? Math.min(100, Math.round((watchedEpisodes / totalEp) * 100)) : 0

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <Link to={`/serie/${show.tmdb_id}`} style={{ position: 'relative', display: 'block' }}>
        <div style={{ aspectRatio: '2/3', background: 'var(--surface-hover)', overflow: 'hidden' }}>
          {show.poster_path ? (
            <img
              src={posterUrl(show.poster_path)}
              alt={show.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--subtext)', fontSize: 12, padding: 8, textAlign: 'center' }}>
              {show.title}
            </div>
          )}
        </div>
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(show) }}
            style={{
              position: 'absolute', top: 6, right: 6, background: 'rgba(30,30,46,0.75)',
              color: isFavorite ? 'var(--gold)' : 'var(--text)', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
            }}
            aria-label="Aggiungi ai preferiti"
          >
            {isFavorite ? '★' : '☆'}
          </button>
        )}
      </Link>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.25, minHeight: 32, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {show.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--subtext)' }}>{show.first_air_year || '—'}</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <span className={`badge status-${show.status}`}>{STATUS_LABEL[show.status]}</span>
          <span className="badge">{TYPE_LABEL[show.media_type]}</span>
          {show.rating > 0 && <span className="badge gold">{show.rating}/10</span>}
        </div>
        {totalEp > 0 && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}
