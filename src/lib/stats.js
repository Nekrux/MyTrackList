import { EMOTIONS, MEDIA_TYPES, STATUSES } from './tmdb'

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

export function computeStats({ shows, episodes, episodeDetails }) {
  shows = shows || []
  episodes = episodes || []
  episodeDetails = episodeDetails || []

  // Ore totali guardate: stima basata su durata episodio dello show × episodi visti
  const showByTmdbId = Object.fromEntries(shows.map(s => [s.tmdb_id, s]))
  let totalMinutes = 0
  episodes.forEach(ep => {
    const show = showByTmdbId[ep.tmdb_show_id]
    totalMinutes += show?.episode_runtime || 30
  })
  const totalHours = Math.round(totalMinutes / 60)

  // Giorni di visione: date distinte in cui è stato visto almeno un episodio
  const watchDays = new Set(episodes.map(e => (e.watched_at || '').slice(0, 10)).filter(Boolean))

  // Episodi questo mese
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const episodesThisMonth = episodes.filter(e => (e.watched_at || '').slice(0, 7) === thisMonthKey).length

  // Voto medio episodi /10
  const epRatings = episodeDetails.map(d => d.rating).filter(r => r > 0)
  const avgEpisodeRating = epRatings.length > 0 ? (epRatings.reduce((a, b) => a + b, 0) / epRatings.length) * 2 : null

  // Episodi per mese (ultimi 12)
  const monthBuckets = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthBuckets.push({ key, label: MONTH_LABELS[d.getMonth()], count: 0 })
  }
  const monthIndex = Object.fromEntries(monthBuckets.map((b, i) => [b.key, i]))
  episodes.forEach(e => {
    const key = (e.watched_at || '').slice(0, 7)
    if (key in monthIndex) monthBuckets[monthIndex[key]].count += 1
  })

  // Serie per tipologia
  const typeCount = { tv: 0, anime: 0, cartoon: 0 }
  shows.forEach(s => { typeCount[s.media_type] = (typeCount[s.media_type] || 0) + 1 })
  const typeData = MEDIA_TYPES.map(t => ({ name: t.label, value: typeCount[t.value] || 0 })).filter(d => d.value > 0)

  // Generi più visti (top 8)
  const genreCount = {}
  shows.forEach(s => {
    const genres = s.genres ? JSON.parse(s.genres) : []
    genres.forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1 })
  })
  const genreData = Object.entries(genreCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Voti serie 1-10
  const showRatingBuckets = Array.from({ length: 10 }, (_, i) => ({ name: String(i + 1), count: 0 }))
  shows.forEach(s => { if (s.rating >= 1 && s.rating <= 10) showRatingBuckets[Math.round(s.rating) - 1].count += 1 })

  // Voti episodi 1-5
  const episodeRatingBuckets = Array.from({ length: 5 }, (_, i) => ({ name: String(i + 1), count: 0 }))
  episodeDetails.forEach(d => { if (d.rating >= 1 && d.rating <= 5) episodeRatingBuckets[d.rating - 1].count += 1 })

  // Emozioni (top 8)
  const emotionCount = {}
  episodeDetails.forEach(d => {
    const emotions = d.emotions ? JSON.parse(d.emotions) : []
    emotions.forEach(id => { emotionCount[id] = (emotionCount[id] || 0) + 1 })
  })
  const emotionData = Object.entries(emotionCount)
    .map(([id, count]) => {
      const meta = EMOTIONS.find(e => e.id === id)
      return { id, emoji: meta?.emoji || '❓', label: meta?.label || id, count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Piattaforme più usate (top 6): combina piattaforma episodio + piattaforma principale show
  const platformCount = {}
  episodeDetails.forEach(d => { if (d.platform) platformCount[d.platform] = (platformCount[d.platform] || 0) + 1 })
  shows.forEach(s => { if (s.main_platform) platformCount[s.main_platform] = (platformCount[s.main_platform] || 0) + 1 })
  const platformData = Object.entries(platformCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // Progresso per stato
  const statusCount = {}
  shows.forEach(s => { statusCount[s.status] = (statusCount[s.status] || 0) + 1 })
  const statusData = STATUSES.map(s => ({
    ...s,
    count: statusCount[s.value] || 0,
    pct: shows.length > 0 ? Math.round(((statusCount[s.value] || 0) / shows.length) * 100) : 0
  }))

  // Top 5 serie meglio votate
  const topRated = shows.filter(s => s.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 5)

  return {
    totalHours,
    watchDays: watchDays.size,
    totalShows: shows.length,
    episodesThisMonth,
    avgEpisodeRating,
    monthBuckets,
    typeData,
    genreData,
    showRatingBuckets,
    episodeRatingBuckets,
    emotionData,
    platformData,
    statusData,
    topRated
  }
}
