// Jikan — API non ufficiale di MyAnimeList. Gratis, senza chiave.
// Rate limit indicativo: ~3 req/s. Match per titolo (rischio mismatch gestito: si usa il primo risultato più affine).
// Non deve MAI bloccare il flusso: se fallisce, ritorna null.
const BASE = 'https://api.jikan.moe/v4'

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Cerca l'anime su MAL e ritorna { mal_id, score } oppure null.
export async function malByTitle(title, originalTitle) {
  const query = originalTitle || title
  if (!query) return null
  try {
    const q = new URLSearchParams({ q: query, limit: '5', sfw: 'true', type: 'tv' })
    const res = await fetch(`${BASE}/anime?${q}`)
    if (!res.ok) return null
    const { data } = await res.json()
    if (!Array.isArray(data) || !data.length) return null

    const targets = [norm(originalTitle), norm(title)].filter(Boolean)
    // 1) match esatto su titolo o titoli alternativi
    let hit = data.find(a => {
      const cands = [a.title, a.title_english, a.title_japanese, ...(a.titles || []).map(t => t.title)]
      return cands.some(c => targets.includes(norm(c)))
    })
    // 2) fallback: primo risultato (Jikan ordina per rilevanza)
    if (!hit) hit = data[0]
    if (!hit) return null
    return { mal_id: hit.mal_id ?? null, score: hit.score ?? null }
  } catch {
    return null
  }
}
