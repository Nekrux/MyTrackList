import { EMOTIONS } from '../lib/tmdb'

export default function EpisodeRow({ episode, watched, details, onToggleWatched, onOpen }) {
  const emotionEmojis = (details?.emotions ? JSON.parse(details.emotions) : [])
    .slice(0, 2)
    .map(id => EMOTIONS.find(e => e.id === id)?.emoji)
    .filter(Boolean)

  return (
    <div
      className="card"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8, cursor: 'pointer' }}
      onClick={onOpen}
    >
      <input
        type="checkbox"
        checked={!!watched}
        onChange={(e) => { e.stopPropagation(); onToggleWatched() }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 20, height: 20, accentColor: 'var(--mauve)', flexShrink: 0, appearance: 'auto' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
          <span style={{ color: 'var(--subtext)' }}>{episode.episode_number}.</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{episode.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 12, color: 'var(--subtext)' }}>
          {emotionEmojis.map((e, i) => <span key={i}>{e}</span>)}
          {details?.fav_character && <span style={{ color: 'var(--mauve)' }}>★ {details.fav_character}</span>}
          {details?.rating > 0 && (
            <span>{'★'.repeat(details.rating)}<span style={{ color: 'var(--overlay)' }}>{'★'.repeat(5 - details.rating)}</span></span>
          )}
          {episode.vote_average > 0 && <span>TMDB {episode.vote_average.toFixed(1)}</span>}
          {episode.runtime && <span>{episode.runtime}min</span>}
        </div>
      </div>
    </div>
  )
}
