// OMDb — voto IMDb. Free tier: 1000 richieste/giorno.
// Non deve MAI bloccare il flusso principale: se fallisce, ritorna null.
const KEY = import.meta.env.VITE_OMDB_API_KEY
const BASE = 'https://www.omdbapi.com/'

export const omdbEnabled = () => !!KEY

async function omdb(params) {
  if (!KEY) return null
  try {
    const q = new URLSearchParams({ apikey: KEY, ...params })
    const res = await fetch(`${BASE}?${q}`)
    if (!res.ok) return null
    const d = await res.json()
    if (d.Response === 'False') return null
    return d
  } catch {
    return null
  }
}

const parseRating = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

// Voto IMDb della serie (serve imdb_id "ttXXXXXXX" dalle external_ids TMDB)
export async function imdbShowRating(imdbId) {
  if (!imdbId) return null
  const d = await omdb({ i: imdbId })
  return d ? parseRating(d.imdbRating) : null
}

// Voto IMDb di un singolo episodio
export async function imdbEpisodeRating(imdbId, season, episode) {
  if (!imdbId) return null
  const d = await omdb({ i: imdbId, Season: season, Episode: episode })
  return d ? parseRating(d.imdbRating) : null
}
