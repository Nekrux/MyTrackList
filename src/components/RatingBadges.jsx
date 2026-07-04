// Badge voti esterni: TMDB (verde), IMDb (oro), MAL (lavanda). Mostra solo quelli disponibili.
export default function RatingBadges({ tmdb, tmdbVotes, imdb, mal, size = 'md' }) {
  const fs = size === 'sm' ? 11 : 12
  const items = []
  if (tmdb != null && tmdb > 0) items.push(
    <span className="rbadge tmdb" key="t" style={{ fontSize: fs }}>
      <span className="src">TMDB</span> {Number(tmdb).toFixed(1)}{tmdbVotes ? <span className="muted" style={{ fontWeight: 400 }}> ({tmdbVotes})</span> : null}
    </span>
  )
  if (imdb != null) items.push(
    <span className="rbadge imdb" key="i" style={{ fontSize: fs }}>
      <span className="src">IMDb</span> {Number(imdb).toFixed(1)}
    </span>
  )
  if (mal != null) items.push(
    <span className="rbadge mal" key="m" style={{ fontSize: fs }}>
      <span className="src">MAL</span> {Number(mal).toFixed(2)}
    </span>
  )
  if (!items.length) return null
  return <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{items}</div>
}
