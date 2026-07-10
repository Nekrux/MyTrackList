export const EMOTIONS = [
  '😍 Adorato', '❤️ Amato', '🔥 Epico', '🤯 Mind-blown',
  '😂 Divertente', '😮 Sorpresa', '😢 Commovente', '💀 Devastante',
  '😡 Frustrante', '😴 Noioso', '🤔 Riflessivo', '👌 Solido',
]

export const PLATFORMS = [
  'Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'Crunchyroll', 'VVVVID',
  'RaiPlay', 'Paramount+', 'TIMVision', 'YouTube', 'Chili', 'Pirateria', 'Altro',
]

export const DEVICES = ['TV', 'PC', 'Smartphone', 'Tablet']

export const STATUSES = [
  { id: 'in_corso', label: 'In corso' },
  { id: 'completata', label: 'Completata' },
  { id: 'da_vedere', label: 'Da vedere' },
  { id: 'in_pausa', label: 'In pausa' },
  { id: 'abbandonata', label: 'Abbandonata' },
]
export const STATUS_LABEL = Object.fromEntries(STATUSES.map(s => [s.id, s.label]))

export const TYPES = [
  { id: 'serie', label: 'Serie TV' },
  { id: 'anime', label: 'Anime' },
  { id: 'cartone', label: 'Cartone' },
]
export const TYPE_LABEL = Object.fromEntries(TYPES.map(t => [t.id, t.label]))

// Generi TV di TMDB (nomi it-IT)
export const GENRES = [
  { id: 18, name: 'Dramma' },
  { id: 35, name: 'Commedia' },
  { id: 80, name: 'Crime' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 9648, name: 'Mistero' },
  { id: 10759, name: 'Azione & Avventura' },
  { id: 16, name: 'Animazione' },
  { id: 10751, name: 'Famiglia' },
  { id: 37, name: 'Western' },
  { id: 99, name: 'Documentario' },
  { id: 10762, name: 'Per Bambini' },
  { id: 10768, name: 'Guerra & Politica' },
]
