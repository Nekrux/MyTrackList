import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchTv, discoverByGenre, getGenres, posterUrl } from '../lib/tmdb'
import Spinner from '../components/Spinner'

export default function Search() {
  const [query, setQuery] = useState('')
  const [genres, setGenres] = useState([])
  const [activeGenre, setActiveGenre] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    getGenres().then(data => setGenres(data.genres || [])).catch(() => setGenres([]))
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) {
      if (!activeGenre) setResults([])
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchTv(query.trim())
        setResults(data.results || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 380)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function handleGenreClick(genre) {
    if (activeGenre?.id === genre.id) {
      setActiveGenre(null)
      if (!query.trim()) setResults([])
      return
    }
    setActiveGenre(genre)
    setQuery('')
    setLoading(true)
    try {
      const data = await discoverByGenre(genre.id)
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="eyebrow">MyTrackList</div>
      <h1 style={{ fontSize: 30, marginBottom: 16 }}>Cerca</h1>

      <div className="field">
        <input
          type="text"
          placeholder="Cerca una serie, anime o cartone..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveGenre(null) }}
        />
      </div>

      <div className="chip-row" style={{ marginBottom: 20 }}>
        {genres.map(g => (
          <button
            key={g.id}
            className={`chip ${activeGenre?.id === g.id ? 'active' : ''}`}
            onClick={() => handleGenreClick(g)}
          >
            {g.name}
          </button>
        ))}
      </div>

      {loading && <Spinner label="Ricerca..." />}

      {!loading && results.length === 0 && (query.trim() || activeGenre) && (
        <div className="empty-state">
          <h3>Nessun risultato</h3>
          <p>Prova con un altro titolo o genere.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map(r => (
            <Link key={r.id} to={`/serie/${r.id}`} className="card" style={{ display: 'flex', gap: 12, padding: 10 }}>
              <div style={{ width: 64, aspectRatio: '2/3', background: 'var(--surface-hover)', overflow: 'hidden', flexShrink: 0 }}>
                {r.poster_path && (
                  <img src={posterUrl(r.poster_path, 'w154')} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'var(--subtext)', marginBottom: 4 }}>
                  {r.first_air_date?.slice(0, 4) || '—'} · {r.origin_country?.join(', ') || '—'} · TMDB {r.vote_average?.toFixed(1) ?? '—'}
                </div>
                <p style={{ fontSize: 12, color: 'var(--subtext)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {r.overview || 'Nessuna sinossi disponibile.'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
