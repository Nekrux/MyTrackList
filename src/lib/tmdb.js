const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'
const LANG = 'it-IT'

async function tmdbFetch(path, params = {}) {
  const url = new URL(BASE_URL + path)
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('language', LANG)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Errore TMDB (${res.status}) su ${path}`)
  }
  return res.json()
}

export function posterUrl(path, size = 'w342') {
  if (!path) return null
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export function backdropUrl(path, size = 'w780') {
  if (!path) return null
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export function profileUrl(path, size = 'w185') {
  if (!path) return null
  return `https://image.tmdb.org/t/p/${size}${path}`
}

// --- Ricerca e discover ---

export function searchTv(query, page = 1) {
  return tmdbFetch('/search/tv', { query, page, include_adult: false })
}

export function discoverByGenre(genreId, page = 1) {
  return tmdbFetch('/discover/tv', { with_genres: genreId, page, sort_by: 'popularity.desc' })
}

export function getTrending() {
  return tmdbFetch('/trending/tv/week')
}

export function getGenres() {
  return tmdbFetch('/genre/tv/list')
}

// --- Dettaglio show ---

export function getShowDetails(tmdbId) {
  return tmdbFetch(`/tv/${tmdbId}`, { append_to_response: 'aggregate_credits' })
}

export function getSeasonDetails(tmdbId, seasonNumber) {
  return tmdbFetch(`/tv/${tmdbId}/season/${seasonNumber}`)
}

export function getEpisodeCredits(tmdbId, seasonNumber, episodeNumber) {
  return tmdbFetch(`/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}/credits`)
}

// Genera un URL medio-formattato per la durata episodi (es. "~24min" o "~24-45min")
export function formatRuntime(runtimes) {
  if (!runtimes || runtimes.length === 0) return null
  const min = Math.min(...runtimes)
  const max = Math.max(...runtimes)
  if (min === max) return `~${min}min`
  return `~${min}-${max}min`
}

export const EMOTIONS = [
  { id: 'adorato', emoji: '😍', label: 'Adorato' },
  { id: 'amato', emoji: '❤️', label: 'Amato' },
  { id: 'epico', emoji: '🔥', label: 'Epico' },
  { id: 'mindblown', emoji: '🤯', label: 'Mind-blown' },
  { id: 'divertente', emoji: '😂', label: 'Divertente' },
  { id: 'sorpresa', emoji: '😮', label: 'Sorpresa' },
  { id: 'commovente', emoji: '😢', label: 'Commovente' },
  { id: 'devastante', emoji: '💀', label: 'Devastante' },
  { id: 'frustrante', emoji: '😡', label: 'Frustrante' },
  { id: 'noioso', emoji: '😴', label: 'Noioso' },
  { id: 'riflessivo', emoji: '🤔', label: 'Riflessivo' },
  { id: 'solido', emoji: '👌', label: 'Solido' }
]

export const PLATFORMS = [
  'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Crunchyroll',
  'VVVVID', 'RaiPlay', 'Paramount+', 'TIMVision', 'YouTube',
  'Chili', 'Pirateria', 'Altro'
]

export const DEVICES = ['TV', 'PC', 'Smartphone', 'Tablet']

export const STATUSES = [
  { value: 'watching', label: 'In corso' },
  { value: 'completed', label: 'Completata' },
  { value: 'planned', label: 'Da vedere' },
  { value: 'paused', label: 'In pausa' },
  { value: 'dropped', label: 'Abbandonata' }
]

export const MEDIA_TYPES = [
  { value: 'tv', label: 'Serie TV' },
  { value: 'anime', label: 'Anime' },
  { value: 'cartoon', label: 'Cartone' }
]
