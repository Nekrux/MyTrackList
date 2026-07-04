import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { searchTv, discoverByGenre } from '../lib/tmdb'
import { listShows } from '../lib/db'
import { GENRES, GENRE_TMDB_ID } from '../lib/constants'
import { ResultCard } from '../components/cards'
import { Loader, Empty } from '../components/ui'

export default function Search() {
  const { user } = useAuth()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [genre, setGenre] = useState(null)
  const [loading, setLoading] = useState(false)
  const [libIds, setLibIds] = useState(new Set())
  const debounce = useRef(null)

  useEffect(() => { listShows(user.id).then(s => setLibIds(new Set(s.map(x => x.tmdb_id)))).catch(() => {}) }, [user.id])

  // ricerca testuale con debounce 380ms
  useEffect(() => {
    clearTimeout(debounce.current)
    if (!q.trim()) { if (!genre) setResults([]); return }
    setGenre(null)
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try { setResults(await searchTv(q.trim())) }
      catch (e) { toast.error(e.message) }
      setLoading(false)
    }, 380)
    return () => clearTimeout(debounce.current)
  }, [q])

  // chip genere: discover, NON inietta testo nel campo
  const pickGenre = async (g) => {
    if (genre === g) { setGenre(null); setResults([]); return }
    setGenre(g); setQ(''); setLoading(true)
    try { setResults(await discoverByGenre(GENRE_TMDB_ID[g])) }
    catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  return (
    <div className="page page-pad-top">
      <h1 className="section-title" style={{ fontSize: 30 }}>Cerca</h1>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input className="field" value={q} onChange={e => setQ(e.target.value)} placeholder="Titolo serie, anime, cartone…" autoCapitalize="none" style={{ paddingLeft: 38 }} />
        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--muted)" style={{ position: 'absolute', left: 12, top: 13 }}>
          <path d="M10 3a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 10 3zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />
        </svg>
      </div>

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {GENRES.map(g => (
          <button key={g} className={'chip' + (genre === g ? ' on' : '')} onClick={() => pickGenre(g)}>{g}</button>
        ))}
      </div>

      {loading ? <Loader /> :
        results.length > 0 ? (
          <div className="grid-3">
            {results.map(r => <ResultCard key={r.id} item={r} inLibrary={libIds.has(r.id)} />)}
          </div>
        ) : (q || genre) ? <Empty title="Nessun risultato">Prova un altro titolo o genere.</Empty>
          : <Empty title="Cerca qualcosa">Digita un titolo o tocca un genere.</Empty>}

      <style>{`.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }`}</style>
    </div>
  )
}
