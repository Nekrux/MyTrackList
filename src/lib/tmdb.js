const API = 'https://api.themoviedb.org/3'
const KEY = import.meta.env.VITE_TMDB_API_KEY

export const tmdbKeyMissing = !KEY

export const IMG = (path, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

async function get(path, params = {}) {
  const url = new URL(API + path)
  url.searchParams.set('api_key', KEY ?? '')
  url.searchParams.set('language', 'it-IT')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url)
  if (!res.ok) {
    let msg = ''
    try { msg = (await res.json()).status_message ?? '' } catch { /* noop */ }
    throw new Error(`TMDB ${res.status}${msg ? `: ${msg}` : ''}`)
  }
  return res.json()
}

export const tmdb = {
  trending: () => get('/trending/tv/week'),
  search: (q) => get('/search/tv', { query: q, include_adult: 'false' }),
  discover: (genreId) => get('/discover/tv', { with_genres: String(genreId), sort_by: 'popularity.desc' }),
  show: (id) => get(`/tv/${id}`, { append_to_response: 'external_ids,aggregate_credits' }),
  season: (id, n) => get(`/tv/${id}/season/${n}`),
  episodeCredits: (id, s, e) => get(`/tv/${id}/season/${s}/episode/${e}/credits`),
  episodeExternalIds: (id, s, e) => get(`/tv/${id}/season/${s}/episode/${e}/external_ids`),
}

// Tipo suggerito: Animazione + Giappone → anime; Animazione → cartone; altrimenti serie
export function guessType(show) {
  const isAnimation = (show.genres || []).some((g) => g.id === 16)
  if (!isAnimation) return 'serie'
  return (show.origin_country || []).includes('JP') ? 'anime' : 'cartone'
}

// Payload user_shows costruito dai dati TMDB (upsert onConflict 'user_id,tmdb_id')
export function buildShowPayload(show, userId, extra = {}) {
  const runtimes = (show.episode_run_time || []).filter(Boolean)
  const episode_runtime = runtimes.length
    ? Math.round(runtimes.reduce((s, x) => s + x, 0) / runtimes.length)
    : show.last_episode_to_air?.runtime ?? null
  return {
    user_id: userId,
    tmdb_id: show.id,
    tvdb_id: show.external_ids?.tvdb_id ?? null,
    imdb_id: show.external_ids?.imdb_id ?? null,
    title: show.name,
    original_title: show.original_name ?? null,
    poster_path: show.poster_path ?? null,
    backdrop_path: show.backdrop_path ?? null,
    first_air_year: show.first_air_date ? Number(show.first_air_date.slice(0, 4)) : null,
    total_episodes: show.number_of_episodes ?? null,
    episode_runtime,
    genres: JSON.stringify((show.genres || []).map((g) => g.name)),
    rating_tmdb: show.vote_average ? Math.round(show.vote_average * 10) / 10 : null,
    media_type: guessType(show),
    ...extra,
  }
}
