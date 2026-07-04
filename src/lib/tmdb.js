const KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'
export const IMG = 'https://image.tmdb.org/t/p'

export const posterUrl = (p, size = 'w342') => (p ? `${IMG}/${size}${p}` : null)
export const backdropUrl = (p, size = 'w780') => (p ? `${IMG}/${size}${p}` : null)
export const profileUrl = (p, size = 'w185') => (p ? `${IMG}/${size}${p}` : null)

async function tmdb(path, params = {}) {
  if (!KEY) throw new Error('VITE_TMDB_API_KEY non impostata: la ricerca TMDB non può funzionare.')
  const q = new URLSearchParams({ api_key: KEY, language: 'it-IT', ...params })
  const res = await fetch(`${BASE}${path}?${q}`)
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json())?.status_message || '' } catch {}
    throw new Error(`TMDB ${res.status}${detail ? ': ' + detail : ''} (${path})`)
  }
  return res.json()
}

export const searchTv = (query, page = 1) =>
  tmdb('/search/tv', { query, page, include_adult: 'false' }).then(d => d.results || [])

export const discoverByGenre = (genreId, page = 1) =>
  tmdb('/discover/tv', { with_genres: genreId, sort_by: 'popularity.desc', page }).then(d => d.results || [])

export const trendingTv = () =>
  tmdb('/trending/tv/week').then(d => d.results || [])

export const getShow = (id) =>
  tmdb(`/tv/${id}`, { append_to_response: 'aggregate_credits,external_ids' })

export const getSeason = (id, seasonNumber) =>
  tmdb(`/tv/${id}/season/${seasonNumber}`)

export const getEpisodeCredits = (id, s, e) =>
  tmdb(`/tv/${id}/season/${s}/episode/${e}/credits`).catch(() => ({ cast: [], guest_stars: [] }))

// durata media episodio in minuti (TMDB.episode_run_time è un array)
export const avgRuntime = (show) => {
  const arr = show?.episode_run_time || []
  if (!arr.length) return null
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}
export const runtimeRange = (show) => {
  const arr = (show?.episode_run_time || []).filter(Boolean)
  if (!arr.length) return null
  const min = Math.min(...arr), max = Math.max(...arr)
  return min === max ? `~${min}min` : `~${min}–${max}min`
}

export const yearOf = (show) => {
  const d = show?.first_air_date
  return d ? parseInt(d.slice(0, 4), 10) : null
}

// genere principale it-IT -> array di soli nomi (per stats)
export const genreNames = (show) => (show?.genres || []).map(g => g.name)
