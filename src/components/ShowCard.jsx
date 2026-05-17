import { useNavigate } from 'react-router-dom'
import { posterUrl } from '../lib/tmdb'

const STATUS_LABELS = {
  watching:      'In corso',
  completed:     'Completata',
  plan_to_watch: 'Da vedere',
  dropped:       'Abbandonata',
  paused:        'In pausa',
}

const TYPE_LABELS = { tv: 'TV', anime: 'Anime', cartoon: 'Cartone' }

export default function ShowCard({ show, watchedCount }) {
  const navigate = useNavigate()
  const watched  = watchedCount ?? show.watched_episodes ?? 0
  const total    = show.total_episodes ?? 0
  const pct      = total > 0 ? Math.round((watched / total) * 100) : 0
  const poster   = posterUrl(show.poster_path, 'w185')

  return (
    <button className="show-card" onClick={() => navigate(`/show/${show.tmdb_id}`)}>
      <div className="show-card-poster">
        {poster
          ? <img src={poster} alt={show.title} loading="lazy" />
          : <span>No img</span>
        }
      </div>

      <div className="show-card-info">
        <div className="show-card-title">{show.title}</div>
        <div className="show-card-meta">
          {show.first_air_year || '—'}
          {show.original_title && show.original_title !== show.title
            ? ` · ${show.original_title}` : ''}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <span className={`badge badge-${show.status}`}>
            {STATUS_LABELS[show.status] || show.status}
          </span>
          <span className={`badge badge-${show.media_type}`}>
            {TYPE_LABELS[show.media_type] || show.media_type}
          </span>
          {show.rating && (
            <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              ★ {show.rating}/10
            </span>
          )}
        </div>

        {total > 0 && (
          <div className="progress-wrap">
            <div className="progress-label">{watched}/{total} ep · {pct}%</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
