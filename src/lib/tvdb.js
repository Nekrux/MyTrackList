// TheTVDB v4 — solo per risolvere i nomi dei personaggi preferiti.
// Facoltativo: senza chiave l'import salta i personaggi.
const BASE = 'https://api4.thetvdb.com/v4'
const KEY = import.meta.env.VITE_TVDB_API_KEY

export const tvdbKeyMissing = !KEY

let token = null

async function login() {
  if (token) return token
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: KEY }),
  })
  if (!res.ok) throw new Error(`TheTVDB login: ${res.status}`)
  const j = await res.json()
  token = j.data?.token
  if (!token) throw new Error('TheTVDB login: token assente nella risposta')
  return token
}

export async function tvdbCharacterName(id) {
  const t = await login()
  const res = await fetch(`${BASE}/characters/${id}`, {
    headers: { Authorization: `Bearer ${t}` },
  })
  if (!res.ok) throw new Error(`TheTVDB personaggio ${id}: ${res.status}`)
  const j = await res.json()
  return j.data?.name ?? null
}
