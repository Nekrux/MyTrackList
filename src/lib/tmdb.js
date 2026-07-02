const KEY  = import.meta.env.VITE_TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'

const get = async (path, params = {}) => {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('api_key', KEY)
  url.searchParams.set('language', 'it-IT')
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v))
  const r = await fetch(url)
  if (!r.ok) throw new Error(`TMDB ${r.status}`)
  return r.json()
}

export const searchShows    = (q, page=1)      => get('/search/tv', { query:q, page })
export const getShowDetails = (id)             => get(`/tv/${id}`, { append_to_response:'credits,aggregate_credits' })
export const getSeason      = (id, s)          => get(`/tv/${id}/season/${s}`)
export const getEpCredits   = (id, s, e)       => get(`/tv/${id}/season/${s}/episode/${e}/credits`)
export const getTrending    = ()               => get('/trending/tv/week')
export const discoverByGenre= (genreId, page=1)=> get('/discover/tv', { with_genres:genreId, sort_by:'popularity.desc', page })

export const imgUrl  = (path, size='w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null
export const airYear = (d) => d ? new Date(d).getFullYear() : null

// Generi TMDB con ID — i nomi corrispondono a quelli restituiti dall'API it-IT
export const MAIN_GENRES = [
  { id:18,    label:'Dramma' },
  { id:35,    label:'Commedia' },
  { id:80,    label:'Crime' },
  { id:10765, label:'Sci-Fi & Fantasy' },
  { id:9648,  label:'Mistero' },
  { id:10759, label:'Azione & Avventura' },
  { id:16,    label:'Animazione' },
  { id:10751, label:'Famiglia' },
  { id:37,    label:'Western' },
  { id:99,    label:'Documentario' },
  { id:10762, label:'Per Bambini' },
  { id:10768, label:'Guerra & Politica' },
]
