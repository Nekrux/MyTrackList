const API_KEY  = import.meta.env.VITE_TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

const get = async (path, params = {}) => {
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('language', 'it-IT')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  return res.json()
}

// Ricerca multi (TV + Anime)
export const searchShows = (query, page = 1) =>
  get('/search/tv', { query, page })

// Dettaglio serie (include lista stagioni)
export const getShowDetails = (id) =>
  get(`/tv/${id}`)

// Episodi di una stagione
export const getSeasonDetails = (showId, season) =>
  get(`/tv/${showId}/season/${season}`)

// Trending della settimana
export const getTrending = () =>
  get('/trending/tv/week')

// Helper immagini
export const posterUrl  = (path, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

export const backdropUrl = (path, size = 'w780') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

// Estrai anno da date string
export const airYear = (dateStr) =>
  dateStr ? new Date(dateStr).getFullYear() : null
