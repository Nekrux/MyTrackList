import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchShows, discoverByGenre, imgUrl, airYear, MAIN_GENRES } from '../lib/tmdb'

export default function Search() {
  const [query,      setQuery]      = useState('')
  const [activeGenre,setActiveGenre]= useState(null) // { id, label }
  const [results,    setResults]    = useState([])
  const [loading,    setLoading]    = useState(false)
  const [empty,      setEmpty]      = useState(false)
  const nav   = useNavigate()
  const timer = useRef(null)

  const doTextSearch = useCallback(async q => {
    if (!q.trim()) { setResults([]); setEmpty(false); return }
    setLoading(true)
    setActiveGenre(null)
    try {
      const d = await searchShows(q)
      const r = (d.results||[]).filter(x=>x.name||x.poster_path)
      setResults(r); setEmpty(r.length===0)
    } catch { setResults([]) }
    setLoading(false)
  }, [])

  const doGenreSearch = useCallback(async (genre) => {
    setLoading(true)
    setQuery('')
    try {
      const d = await discoverByGenre(genre.id)
      const r = d.results||[]
      setResults(r); setEmpty(r.length===0)
    } catch { setResults([]) }
    setLoading(false)
  }, [])

  const onQueryChange = e => {
    const q = e.target.value
    setQuery(q)
    setActiveGenre(null)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => doTextSearch(q), 380)
  }

  const onGenreClick = genre => {
    if (activeGenre?.id === genre.id) {
      // deseleziona
      setActiveGenre(null)
      setResults([])
      setEmpty(false)
    } else {
      setActiveGenre(genre)
      doGenreSearch(genre)
    }
  }

  const showGenreChips = results.length === 0 && !query.trim() && !loading
  const showResults    = results.length > 0 || (activeGenre && !loading)

  return (
    <div className="page">
      <h1 className="page-title">CERCA</h1>

      <div style={{ position:'relative', marginBottom:12 }}>
        <svg style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',width:16,height:16,pointerEvents:'none' }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input className="input" type="search"
          placeholder="Cerca serie, anime, cartoni..."
          value={query} onChange={onQueryChange}
          style={{ paddingLeft:34 }} autoFocus />
      </div>

      {/* Generi — sempre visibili come filtro rapido */}
      <div style={{ marginBottom:14 }}>
        {(showGenreChips || activeGenre) && <div className="label" style={{ marginBottom:6 }}>Sfoglia per genere</div>}
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {MAIN_GENRES.map(g => (
            <button key={g.id}
              className={`chip${activeGenre?.id===g.id?' active':''}`}
              onClick={() => onGenreClick(g)}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ display:'flex',justifyContent:'center',padding:32 }}><div className="spinner" /></div>}
      {empty && !loading && (
        <div className="empty-state">
          <p>Nessun risultato{activeGenre ? ` per "${activeGenre.label}"` : ` per "${query}"`}</p>
        </div>
      )}

      <div className="show-grid">
        {results.map(s => {
          const poster = imgUrl(s.poster_path,'w185')
          return (
            <button key={s.id} className="show-card" onClick={() => nav(`/show/${s.id}`)}>
              <div className="show-card-poster">
                {poster ? <img src={poster} alt={s.name} loading="lazy" /> : <span>—</span>}
              </div>
              <div className="show-card-info">
                <div className="show-card-title">{s.name}</div>
                <div className="show-card-meta">
                  {airYear(s.first_air_date)||'—'}
                  {s.origin_country?.length ? ` · ${s.origin_country[0]}` : ''}
                  {s.vote_average>0 ? ` · ⭐ ${s.vote_average.toFixed(1)}` : ''}
                </div>
                {s.overview && (
                  <p style={{ fontSize:11,color:'var(--muted)',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>
                    {s.overview}
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
