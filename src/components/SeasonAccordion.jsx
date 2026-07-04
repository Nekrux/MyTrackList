import { useState } from 'react'
import { getSeason } from '../lib/tmdb'
import { useToast } from '../context/ToastContext'

const parseArr = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }
const key = (s, e) => `${s}:${e}`

export default function SeasonAccordion({
  show, season, watchedSet, detailsMap, track,
  onToggleEpisode, onMarkAll, onUnmarkAll, onRewatch, onDates, onOpenEpisode,
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [episodes, setEpisodes] = useState(null)
  const [loading, setLoading] = useState(false)

  const seasonNumber = season.season_number
  const watchCount = track?.watch_count || 0

  const loadEps = async () => {
    if (episodes) return episodes
    setLoading(true)
    try {
      const data = await getSeason(show.id, seasonNumber)
      const eps = data.episodes || []
      setEpisodes(eps); setLoading(false); return eps
    } catch (e) { toast.error(e.message); setLoading(false); return [] }
  }

  const toggleOpen = async () => {
    const next = !open; setOpen(next)
    if (next && !episodes) await loadEps()
  }

  // conteggio visti dagli episodi già segnati (funziona anche a stagione chiusa)
  let watchedInSeason = 0
  for (const k of watchedSet) if (k.startsWith(`${seasonNumber}:`)) watchedInSeason++
  const total = season.episode_count || (episodes ? episodes.length : 0)

  const markAll = async (e) => {
    e.stopPropagation()
    const eps = await loadEps()
    onMarkAll(seasonNumber, eps.map(x => x.episode_number))
  }
  const clearAll = async (e) => {
    e.stopPropagation()
    const eps = episodes || await loadEps()
    onUnmarkAll(seasonNumber, eps.map(x => x.episode_number))
  }

  return (
    <div className="sa">
      <button className="sa-head" onClick={toggleOpen}>
        <div className="sa-head-l">
          <span className="sa-name">{season.name || `Stagione ${seasonNumber}`}</span>
          {watchCount > 0 && <span className="sa-rw" title={`Rivista ${watchCount}×`}>×{1 + watchCount}</span>}
        </div>
        <div className="sa-head-r">
          <span className="muted tabular" style={{ fontSize: 12 }}>{watchedInSeason}/{total || '?'}</span>
          <span className={'sa-chev' + (open ? ' up' : '')}>▾</span>
        </div>
      </button>

      {open && (
        <div className="sa-body">
          <div className="sa-tools">
            <button className="chip" onClick={markAll}>Segna tutti</button>
            <button className="chip" onClick={clearAll}>Deseleziona</button>
            <div className="sa-rewatch">
              <span className="muted" style={{ fontSize: 12 }}>Rewatch</span>
              <button className="rw-btn" onClick={(e) => { e.stopPropagation(); if (watchCount > 0) onRewatch(seasonNumber, watchCount - 1) }} disabled={watchCount === 0}>−</button>
              <span className="rw-n tabular">{watchCount}</span>
              <button className="rw-btn" onClick={(e) => { e.stopPropagation(); onRewatch(seasonNumber, watchCount + 1) }}>+</button>
            </div>
          </div>
          {watchCount > 0 && <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>Ogni episodio di questa stagione pesa ×{1 + watchCount} nelle ore totali.</div>}

          <div className="sa-dates">
            <div>
              <label className="lbl" style={{ margin: '0 0 4px' }}>Iniziata</label>
              <input className="field" type="date" value={track?.start_date || ''} onChange={e => onDates(seasonNumber, { start_date: e.target.value || null })} />
            </div>
            <div>
              <label className="lbl" style={{ margin: '0 0 4px' }}>Finita</label>
              <input className="field" type="date" value={track?.end_date || ''} onChange={e => onDates(seasonNumber, { end_date: e.target.value || null })} />
            </div>
          </div>

          {loading ? <div className="muted" style={{ padding: '10px 0' }}>Carico episodi…</div> : (
            <div className="sa-eps">
              {(episodes || []).map(ep => {
                const k = key(seasonNumber, ep.episode_number)
                const isW = watchedSet.has(k)
                const det = detailsMap.get(k)
                const emos = parseArr(det?.emotions).slice(0, 2)
                return (
                  <div key={ep.episode_number} className={'ep-row' + (isW ? ' w' : '')}>
                    <button className={'ep-check' + (isW ? ' on' : '')} onClick={(e) => { e.stopPropagation(); onToggleEpisode(seasonNumber, ep.episode_number, !isW) }} aria-label="Visto">
                      {isW ? '✓' : ''}
                    </button>
                    <div className="ep-main" onClick={() => onOpenEpisode(seasonNumber, ep)}>
                      <div className="ep-line1">
                        <span className="ep-num">{ep.episode_number}.</span>
                        <span className="ep-title">{ep.name}</span>
                      </div>
                      <div className="ep-meta">
                        {det?.rating ? <span className="ep-rate">★ {det.rating}/10</span> : null}
                        {emos.length ? <span>{emos.join(' ')}</span> : null}
                        {det?.fav_character ? <span className="ep-char">♦ {det.fav_character}</span> : null}
                        {ep.vote_average > 0 ? <span className="muted">TMDB {ep.vote_average.toFixed(1)}</span> : null}
                        {det?.imdb_rating != null ? <span className="ep-imdb">IMDb {Number(det.imdb_rating).toFixed(1)}</span> : null}
                        {ep.runtime ? <span className="muted">~{ep.runtime}m</span> : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        .sa { border: 1px solid var(--surface0); margin-bottom: 8px; background: var(--mantle); }
        .sa-head { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px; }
        .sa-head-l { display: flex; align-items: center; gap: 8px; }
        .sa-name { font-family: var(--f-display); font-size: 18px; letter-spacing: .03em; color: var(--text); }
        .sa-rw { font-size: 11px; font-weight: 800; color: var(--mauve); border: 1px solid var(--mauve); padding: 1px 5px; }
        .sa-head-r { display: flex; align-items: center; gap: 10px; }
        .sa-chev { color: var(--muted); transition: transform .15s; }
        .sa-chev.up { transform: rotate(180deg); }
        .sa-body { padding: 0 12px 12px; }
        .sa-tools { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
        .sa-rewatch { display: flex; align-items: center; gap: 6px; margin-left: auto; }
        .rw-btn { width: 28px; height: 28px; background: var(--surface0); border: 1px solid var(--surface1); color: var(--text); font-size: 16px; font-weight: 700; }
        .rw-btn:disabled { opacity: .4; }
        .rw-n { min-width: 16px; text-align: center; color: var(--mauve); font-weight: 700; }
        .sa-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .sa-eps { display: flex; flex-direction: column; }
        .ep-row { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-top: 1px solid var(--surface0); }
        .ep-check { flex: 0 0 auto; width: 24px; height: 24px; margin-top: 2px; border: 1.5px solid var(--surface2); color: #1a1626; font-weight: 800; font-size: 13px; background: transparent; }
        .ep-check.on { background: var(--green); border-color: var(--green); }
        .ep-main { flex: 1; min-width: 0; cursor: pointer; }
        .ep-line1 { display: flex; gap: 6px; }
        .ep-num { color: var(--muted); font-weight: 700; font-size: 14px; }
        .ep-title { font-size: 14px; font-weight: 600; line-height: 1.25; }
        .ep-row.w .ep-title { color: var(--subtext); }
        .ep-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 3px; font-size: 11px; align-items: center; }
        .ep-rate { color: var(--gold); font-weight: 700; }
        .ep-char { color: var(--lavender); }
        .ep-imdb { color: var(--gold); }
      `}</style>
    </div>
  )
}
