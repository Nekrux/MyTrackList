import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { tmdb, IMG } from '../lib/tmdb'
import { GENRES } from '../lib/constants'

export default function Search() {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState(null) // chip deselezionabile, NON inietta testo
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [searching, setSearching] = useState(false)
  const timer = useRef(null)
  const reqId = useRef(0)

  useEffect(() => {
    window.clearTimeout(timer.current)
    const q = query.trim()
    if (!q && genre == null) {
      setResults(null)
      setError(null)
      return undefined
    }
    setSearching(true)
    timer.current = window.setTimeout(async () => {
      const id = ++reqId.current
      try {
        const data = q ? await tmdb.search(q) : await tmdb.discover(genre)
        if (id !== reqId.current) return
        setResults(data.results ?? [])
        setError(null)
      } catch (err) {
        if (id !== reqId.current) return
        setError(err.message)
      } finally {
        if (id === reqId.current) setSearching(false)
      }
    }, 380)
    return () => window.clearTimeout(timer.current)
  }, [query, genre])

  return (
    <>
      <h1 className="page-title">CERCA</h1>

      <input
        className="input mt-16"
        type="search"
        placeholder="Titolo serie, anime, cartone…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chips mt-8">
        {GENRES.map((g) => (
          <button key={g.id} type="button"
            className={`chip-btn${genre === g.id ? ' on' : ''}`}
            onClick={() => setGenre(genre === g.id ? null : g.id)}>
            {g.name}
          </button>
        ))}
      </div>

      {error && (
        <div className="banner banner-error mt-16">
          <span className="banner-tag">ERR</span>
          <span className="banner-msg mono">{error}</span>
        </div>
      )}

      {searching && <p className="overline mt-16">// ricerca…</p>}

      {results?.length === 0 && !searching && (
        <div className="empty-state mt-16">
          <span className="overline">// nessun risultato</span>
          Prova con un altro titolo o genere.
        </div>
      )}

      {results?.length > 0 && (
        <div className="stack-8 mt-16">
          {results.map((r) => (
            <Link key={r.id} to={`/serie/${r.id}`} className="result-row">
              {r.poster_path
                ? <img className="result-poster" src={IMG(r.poster_path, 'w154')} alt="" loading="lazy" />
                : <div className="result-poster poster-empty">{r.name?.charAt(0)}</div>}
              <div style={{ minWidth: 0 }}>
                <div className="result-title">{r.name}</div>
                <div className="overline">
                  {[r.first_air_date?.slice(0, 4),
                    (r.origin_country ?? []).join('/') || null,
                    r.vote_average ? `TMDB ${r.vote_average.toFixed(1)}` : null,
                  ].filter(Boolean).join(' · ')}
                </div>
                {r.overview && <p className="result-overview clamp2">{r.overview}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!results && !searching && !error && (
        <div className="empty-state mt-16">
          <span className="overline">// pronto</span>
          Scrivi un titolo oppure scegli un genere.
        </div>
      )}
    </>
  )
}
