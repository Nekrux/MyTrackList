import { useNavigate } from 'react-router-dom'
import { Poster } from './ui'
import RatingBadges from './RatingBadges'
import { statusLabel, typeLabel } from '../lib/constants'
import { yearOf } from '../lib/tmdb'

// Card della Libreria (da una riga user_shows)
export function LibraryCard({ show, watched = 0, total = 0, isFav = false, onToggleFav }) {
  const nav = useNavigate()
  const pct = total ? Math.min(100, Math.round((watched / total) * 100)) : 0
  return (
    <div className="card lib-card" onClick={() => nav(`/show/${show.tmdb_id}`)}>
      <Poster path={show.poster_path} alt={show.title} width={92} />
      <div className="lib-body">
        <div className="lib-top">
          <h3 className="lib-title">{show.title}</h3>
          <button className="fav-btn" onClick={(e) => { e.stopPropagation(); onToggleFav?.(show) }} aria-label="Preferito">
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isFav ? 'var(--gold)' : 'none'} stroke={isFav ? 'var(--gold)' : 'var(--muted)'} strokeWidth="2">
              <path d="M12 3l2.9 6.26 6.1.53-4.6 4.02 1.38 6.16L12 15.9 6.22 20l1.38-6.16-4.6-4.02 6.1-.53z" />
            </svg>
          </button>
        </div>
        <div className="lib-year muted">{show.first_air_year || '—'}</div>
        <div className="lib-badges">
          <span className={`pill pill-${show.status}`}>{statusLabel(show.status)}</span>
          <span className="pill pill-type">{typeLabel(show.show_type)}</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <RatingBadges tmdb={null} imdb={show.imdb_rating} mal={show.mal_rating} size="sm" />
        </div>
        {total > 0 && (
          <div className="lib-prog">
            <div className="prog"><i style={{ width: pct + '%' }} /></div>
            <span className="muted tabular" style={{ fontSize: 11 }}>{watched}/{total}</span>
          </div>
        )}
      </div>
      <style>{`
        .lib-card { display: flex; gap: 12px; padding: 10px; cursor: pointer; transition: background .12s; }
        .lib-card:active { background: var(--surface1); }
        .lib-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .lib-top { display: flex; align-items: flex-start; gap: 8px; }
        .lib-title { font-family: var(--f-body); font-weight: 700; font-size: 15px; line-height: 1.2; flex: 1;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .fav-btn { flex: 0 0 auto; padding: 2px; }
        .lib-year { font-size: 12px; margin-top: 2px; }
        .lib-badges { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
        .lib-prog { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 8px; }
        .lib-prog .prog { flex: 1; }
      `}</style>
    </div>
  )
}

// Card risultato TMDB (ricerca/trending)
export function ResultCard({ item, inLibrary = false }) {
  const nav = useNavigate()
  const title = item.name || item.title
  const year = yearOf(item)
  return (
    <div className="res-card" onClick={() => nav(`/show/${item.id}`)}>
      <Poster path={item.poster_path} alt={title} width={'100%'} />
      <div className="res-meta">
        <div className="res-title">{title}</div>
        <div className="res-sub">
          <span className="muted">{year || '—'}</span>
          {item.vote_average > 0 && <RatingBadges tmdb={item.vote_average} size="sm" />}
        </div>
      </div>
      {inLibrary && <div className="res-flag">In libreria</div>}
      <style>{`
        .res-card { position: relative; cursor: pointer; }
        .res-card:active { opacity: .85; }
        .res-meta { padding: 6px 2px; }
        .res-title { font-size: 13px; font-weight: 600; line-height: 1.2;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .res-sub { display: flex; align-items: center; gap: 6px; margin-top: 3px; font-size: 11px; }
        .res-flag { position: absolute; top: 6px; left: 6px; background: rgba(30,30,46,.9); color: var(--mauve);
          font-size: 10px; font-weight: 700; padding: 3px 6px; border: 1px solid var(--mauve); }
      `}</style>
    </div>
  )
}
