// Stati serie
export const STATUSES = [
  { key: 'in_corso',    label: 'In corso' },
  { key: 'completata',  label: 'Completata' },
  { key: 'da_vedere',   label: 'Da vedere' },
  { key: 'in_pausa',    label: 'In pausa' },
  { key: 'abbandonata', label: 'Abbandonata' },
]
export const statusLabel = (k) => (STATUSES.find(s => s.key === k)?.label ?? k)

// Tipo
export const SHOW_TYPES = [
  { key: 'serie',   label: 'Serie TV' },
  { key: 'anime',   label: 'Anime' },
  { key: 'cartone', label: 'Cartone' },
]
export const typeLabel = (k) => (SHOW_TYPES.find(t => t.key === k)?.label ?? k)

// Piattaforme (scelta singola)
export const PLATFORMS = [
  'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Crunchyroll', 'VVVVID',
  'RaiPlay', 'Paramount+', 'TIMVision', 'YouTube', 'Chili', 'Pirateria', 'Altro',
]

// Dispositivi (sottocategoria separata dalla piattaforma)
export const DEVICES = ['TV', 'PC', 'Smartphone', 'Tablet']

// Emozioni episodio (min 12) — emoji + etichetta
export const EMOTIONS = [
  { e: '😍', label: 'Adorato' },
  { e: '❤️', label: 'Amato' },
  { e: '🔥', label: 'Epico' },
  { e: '🤯', label: 'Mind-blown' },
  { e: '😂', label: 'Divertente' },
  { e: '😮', label: 'Sorpresa' },
  { e: '😢', label: 'Commovente' },
  { e: '💀', label: 'Devastante' },
  { e: '😡', label: 'Frustrante' },
  { e: '😴', label: 'Noioso' },
  { e: '🤔', label: 'Riflessivo' },
  { e: '👌', label: 'Solido' },
]
export const emotionLabel = (e) => (EMOTIONS.find(x => x.e === e)?.label ?? e)

// Generi curati (TMDB it-IT)
export const GENRES = [
  'Dramma', 'Commedia', 'Crime', 'Sci-Fi & Fantasy', 'Mistero',
  'Azione & Avventura', 'Animazione', 'Famiglia', 'Western',
  'Documentario', 'Per Bambini', 'Guerra & Politica',
]
// mappa genere -> id TMDB (per /discover/tv, id ufficiali TV it-IT)
export const GENRE_TMDB_ID = {
  'Azione & Avventura': 10759,
  'Animazione': 16,
  'Commedia': 35,
  'Crime': 80,
  'Documentario': 99,
  'Dramma': 18,
  'Famiglia': 10751,
  'Per Bambini': 10762,
  'Mistero': 9648,
  'Guerra & Politica': 10768,
  'Sci-Fi & Fantasy': 10765,
  'Western': 37,
}

export const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
