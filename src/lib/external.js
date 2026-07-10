// Voti esterni: OMDb (IMDb) e Jikan (MyAnimeList).
// Falliscono in silenzio: l'app funziona anche solo con TMDB.

const OMDB_KEY = import.meta.env.VITE_OMDB_API_KEY

export async function omdbRating(imdbId) {
  if (!OMDB_KEY || !imdbId) return null
  try {
    const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${imdbId}`)
    if (!res.ok) return null
    const j = await res.json()
    const r = parseFloat(j.imdbRating)
    return Number.isFinite(r) ? r : null
  } catch { return null }
}

export async function malLookup(title, year) {
  try {
    const url = new URL('https://api.jikan.moe/v4/anime')
    url.searchParams.set('q', title)
    url.searchParams.set('limit', '5')
    const res = await fetch(url)
    if (!res.ok) return null
    const j = await res.json()
    const list = j.data || []
    if (!list.length) return null
    const best = (year && list.find((a) => a.year === year)) || list[0]
    return { mal_id: best.mal_id, score: best.score ?? null }
  } catch { return null }
}
