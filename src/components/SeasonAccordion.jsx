import { useState } from 'react'
import { tmdb } from '../lib/tmdb'
import { starText, parseJSONArray } from '../lib/format'
import ConfirmButton from './ConfirmButton'
import { useToast } from '../context/ToastContext'

// season: da show.seasons (season_number, episode_count, name)
// epsMap/detMap: chiavi `${s}-${e}` · tracking: riga season_tracking o null
export default function SeasonAccordion({
  showId, season, epsMap, detMap, tracking,
  onOpenEpisode, onMark, onUnmark, onMarkAll, onUnmarkAll, onRewatchSeason, onSaveDates,
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [episodes, setEpisodes] = useState(null)
  const [loading, setLoading] = useState(false)

  const s = season.season_number
  const seasonEps = Object.entries(epsMap).filter(([k]) => k.startsWith(`${s}-`))
  const watchedCount = seasonEps.length
  const minWc = seasonEps.length
    ? Math.min(...seasonEps.map(([, r]) => r.watch_count))
    : 0

  async function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next && !episodes && !loading) {
      setLoading(true)
      try {
        const data = await tmdb.season(showId, s)
        setEpisodes(data.episodes || [])
      } catch (err) {
        toast.error(`Stagione ${s}: ${err.message}`)
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }
  }

  async function ensureEpisodes() {
    if (episodes) return episodes
    const data = await tmdb.season(showId, s)
    setEpisodes(data.episodes || [])
    return data.episodes || []
  }

  return (
    <div className="accordion">
      <button type="button" className="acc-head" onClick={toggleOpen} aria-expanded={open}>
        <span className="acc-title">{season.name || `Stagione ${s}`}</span>
        {minWc > 1 && <span className="badge badge-mauve">×{minWc}</span>}
        <span className="acc-count mono">{watchedCount}/{season.episode_count}</span>
        <span className="acc-chevron">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="acc-body">
          <div className="acc-dates">
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Inizio</label>
              <input className="input" type="date" value={tracking?.start_date ?? ''}
                onChange={(e) => onSaveDates(s, { start_date: e.target.value || null })} />
            </div>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Fine</label>
              <input className="input" type="date" value={tracking?.end_date ?? ''}
                onChange={(e) => onSaveDates(s, { end_date: e.target.value || null })} />
            </div>
          </div>

          <div className="acc-actions">
            <button type="button" className="btn btn-sm"
              onClick={async () => onMarkAll(s, await ensureEpisodes())}>
              Segna tutti
            </button>
            <button type="button" className="btn btn-sm btn-ghost"
              onClick={() => onUnmarkAll(s)}>
              Deseleziona
            </button>
            {watchedCount > 0 && (
              <ConfirmButton
                label="Rivista tutta +1"
                confirmLabel="Conferma +1"
                className="btn btn-sm btn-ghost"
                armedClassName="btn btn-sm btn-primary"
                onConfirm={() => onRewatchSeason(s)}
              />
            )}
          </div>

          {loading && <p className="overline">// caricamento episodi…</p>}

          {episodes?.map((ep) => {
            const key = `${s}-${ep.episode_number}`
            const row = epsMap[key]
            const det = detMap[key]
            const emojiList = parseJSONArray(det?.emotions)
            const emojis = emojiList.length
              ? emojiList.slice(0, 2).map((e) => e.split(' ')[0]).join(' ')
              : null
            const meta = [
              emojis,
              det?.fav_character ? '★' : null,
              det?.rating != null ? `☆ ${starText(det.rating)}` : null,
              row?.watch_count > 1 ? `×${row.watch_count}` : null,
              ep.vote_average ? `TMDB ${ep.vote_average.toFixed(1)}` : null,
              det?.rating_imdb != null ? `IMDb ${det.rating_imdb}` : null,
              ep.runtime ? `${ep.runtime}min` : null,
            ].filter(Boolean)

            return (
              <div key={key} className="ep-row">
                <button
                  type="button"
                  className={`checkbox${row ? ' checked' : ''}`}
                  aria-label={row ? 'Segna non visto' : 'Segna visto'}
                  onClick={(e) => {
                    e.stopPropagation()
                    row ? onUnmark(ep) : onMark(ep)
                  }}
                >
                  {row ? '✓' : ''}
                </button>
                <button type="button" className="ep-main" onClick={() => onOpenEpisode(ep)}>
                  <span className="ep-title">
                    <span className="mono ep-num">E{String(ep.episode_number).padStart(2, '0')}</span>
                    {ep.name || `Episodio ${ep.episode_number}`}
                  </span>
                  {meta.length > 0 && <span className="ep-meta">{meta.join(' · ')}</span>}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
