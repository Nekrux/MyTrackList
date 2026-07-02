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

export const searchShows    = (q, page=1)    => get('/search/tv', { query:q, page })
export const getShowDetails = (id)           => get(`/tv/${id}`, { append_to_response:'credits' })
export const getSeason      = (id, s)        => get(`/tv/${id}/season/${s}`)
export const getTrending    = ()             => get('/trending/tv/week')
export const getGenres      = ()             => get('/genre/tv/list')
export const discoverByGenre= (gid, page=1)  => get('/discover/tv', { with_genres:gid, page })

export const imgUrl = (path, size='w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

export const airYear = (d) => d ? new Date(d).getFullYear() : null

export const GENRES_IT = {
  10759: 'Azione/Avventura', 16: 'Animazione', 35: 'Commedia',
  80: 'Crime', 99: 'Documentario', 18: 'Dramma',
  10751: 'Famiglia', 10762: 'Per bambini', 9648: 'Mistero',
  10763: 'Notizie', 10764: 'Reality', 10765: 'Sci-Fi/Fantasy',
  10766: 'Soap', 10767: 'Talk', 10768: 'Guerra/Politica', 37: 'Western'
}
