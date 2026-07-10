import { Link } from 'react-router-dom'
import { IMG } from '../lib/tmdb'
import { STATUS_LABEL, TYPE_LABEL } from '../lib/constants'
import ProgressBar from './ProgressBar'
import FavToggle from './FavToggle'

export default function ShowCard({ show, watched = 0, isFav, onFav }) {
  return (
    <Link to={`/serie/${show.tmdb_id}`} className="show-card">
      <div className="poster-box">
        {show.poster_path
          ? <img className="poster" src={IMG(show.poster_path, 'w342')} alt="" loading="lazy" />
          : <div className="poster poster-empty">{show.title.charAt(0)}</div>}
        <FavToggle show={show} isFav={isFav} onChange={onFav} className="fav-overlay" />
      </div>
      <div className="show-card-body">
        <div className="show-card-title">{show.title}</div>
        <div className="show-card-year mono">{show.first_air_year ?? '—'}</div>
        <div className="badge-row">
          <span className="badge badge-mauve">{STATUS_LABEL[show.status]}</span>
          <span className="badge">{TYPE_LABEL[show.media_type]}</span>
          {show.rating != null && <span className="badge badge-gold">★ {show.rating}</span>}
        </div>
        {show.total_episodes > 0 && (
          <>
            <ProgressBar value={watched} max={show.total_episodes} />
            <div className="show-card-eps mono">{watched}/{show.total_episodes} ep</div>
          </>
        )}
      </div>
    </Link>
  )
}
