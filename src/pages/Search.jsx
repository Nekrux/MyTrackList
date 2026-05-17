import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchShows, posterUrl, airYear } from '../lib/tmdb'

export default function Search() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [empty,   setEmpty]   = useState(false)
  const navigate = useNavigate()
  const timer = useRef(null)

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setEmpty(false); return }
    setLoading(true)
    try {
      const data = await searchShows(q)
      const filtered = (data.results || []).filter(r => r.poster_path || r.name)
      setResults(filtered)
      setEmpty(filtered.length === 0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const onChange = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(q), 400)
  }

  return (
    <div className="page">
      <h1 className="page-title">CERCA</h1>

      <div className="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="input"
          type="search"
          placeholder="Cerca serie, anime, cartoni..."
          value={query}
          onChange={onChange}
          autoFocus
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <div className="spinner" />
        </div>
      )}

      {empty && !loading && (
        <div className="empty-state">
          <p>Nessun risultato per "{query}"</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map(show => {
          const poster = posterUrl(show.poster_path, 'w185')
          return (
            <button
              key={show.id}
              className="show-card"
              onClick={() => navigate(`/show/${show.id}`)}
            >
              <div className="show-card-poster">
                {poster
                  ? <img src={poster} alt={show.name} loading="lazy" />
                  : <span>No img</span>
                }
              </div>
              <div className="show-card-info">
                <div className="show-card-title">{show.name}</div>
                <div className="show-card-meta">
                  {airYear(show.first_air_date) || '—'}
                  {show.origin_country?.length
                    ? ` · ${show.origin_country.join(', ')}` : ''}
                </div>
                {show.overview && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {show.overview}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
