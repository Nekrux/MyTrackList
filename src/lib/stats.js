import { EMOTIONS, MEDIA_TYPES, STATUSES } from './tmdb'

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

function fmtDDMM(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // lunedì = 0
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export function computeStats({ shows, episodes, episodeDetails, seasonTracking }) {
  shows = shows || []
  episodes = episodes || []
  episodeDetails = episodeDetails || []
  seasonTracking = seasonTracking || []

  const showByTmdbId = Object.fromEntries(shows.map(s => [s.tmdb_id, s]))
  const seasonMap = Object.fromEntries(seasonTracking.map(s => [`${s.tmdb_show_id}-${s.season_number}`, s]))

  // Moltiplicatore di stagione: 1 (prima visione) + numero di rewatch registrati
  function seasonMultiplier(tmdbShowId, seasonNumber) {
    const row = seasonMap[`${tmdbShowId}-${seasonNumber}`]
    return 1 + (row?.watch_count || 0)
  }
  function episodeHours(ep) {
    const show = showByTmdbId[ep.tmdb_show_id]
    const runtime = show?.episode_runtime || 30
    return (runtime * seasonMultiplier(ep.tmdb_show_id, ep.season_number)) / 60
  }

  // Ore totali guardate (moltiplicate per i rewatch di stagione)
  const totalHoursExact = episodes.reduce((sum, ep) => sum + episodeHours(ep), 0)
  const totalHours = Math.round(totalHoursExact)

  // Episodi visti in totale, incluse le rivisioni di stagione
  const totalEpisodeViews = Math.round(
    episodes.reduce((sum, ep) => sum + seasonMultiplier(ep.tmdb_show_id, ep.season_number), 0)
  )

  // Giorni di visione: date distinte in cui è stato completato almeno un episodio
  const watchDays = new Set(episodes.map(e => (e.watched_at || '').slice(0, 10)).filter(Boolean))

  // Episodi questo mese (visione più recente per episodio, non moltiplicata)
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const episodesThisMonth = episodes.filter(e => (e.watched_at || '').slice(0, 7) === thisMonthKey).length

  // Voto medio episodi /10
  const epRatings = episodeDetails.map(d => d.rating).filter(r => r > 0)
  const avgEpisodeRating = epRatings.length > 0 ? (epRatings.reduce((a, b) => a + b, 0) / epRatings.length) * 2 : null

  // Episodi per mese (ultimi 12) — conteggio grezzo, non moltiplicato
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

  // --- Serie temporali delle ore guardate (giorni / settimane / mesi / anni) ---
  // Nota: i rewatch di stagione non hanno una data propria (solo un contatore),
  // quindi le ore aggiuntive dovute ai rewatch vengono attribuite alla data
  // dell'ultima visione registrata per l'episodio: è una stima, non un log preciso.
  const daily = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    daily.push({ key: d.toISOString().slice(0, 10), label: fmtDDMM(d), hours: 0 })
  }
  const dailyIndex = Object.fromEntries(daily.map((b, i) => [b.key, i]))

  const weekly = []
  const thisWeekStart = startOfWeek(now)
  for (let i = 11; i >= 0; i--) {
    const d = new Date(thisWeekStart)
    d.setDate(d.getDate() - i * 7)
    weekly.push({ key: d.toISOString().slice(0, 10), label: fmtDDMM(d), hours: 0 })
  }
  const weeklyIndex = Object.fromEntries(weekly.map((b, i) => [b.key, i]))

  const monthlyHours = monthBuckets.map(b => ({ key: b.key, label: b.label, hours: 0 }))
  const monthlyHoursIndex = Object.fromEntries(monthlyHours.map((b, i) => [b.key, i]))

  const yearsSet = new Set(episodes.map(e => (e.watched_at || '').slice(0, 4)).filter(Boolean))
  const years = Array.from(yearsSet).sort()
  const yearly = years.map(y => ({ key: y, label: y, hours: 0 }))
  const yearlyIndex = Object.fromEntries(yearly.map((b, i) => [b.key, i]))

  episodes.forEach(ep => {
    const dateStr = (ep.watched_at || '').slice(0, 10)
    if (!dateStr) return
    const hrs = episodeHours(ep)

    if (dateStr in dailyIndex) daily[dailyIndex[dateStr]].hours += hrs
    const wKey = startOfWeek(new Date(dateStr)).toISOString().slice(0, 10)
    if (wKey in weeklyIndex) weekly[weeklyIndex[wKey]].hours += hrs
    const mKey = dateStr.slice(0, 7)
    if (mKey in monthlyHoursIndex) monthlyHours[monthlyHoursIndex[mKey]].hours += hrs
    const yKey = dateStr.slice(0, 4)
    if (yKey in yearlyIndex) yearly[yearlyIndex[yKey]].hours += hrs
  })

  const round1 = (arr) => arr.map(b => ({ ...b, hours: Math.round(b.hours * 10) / 10 }))
  const hoursSeries = {
    daily: round1(daily),
    weekly: round1(weekly),
    monthly: round1(monthlyHours),
    yearly: round1(yearly)
  }

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
    totalEpisodeViews,
    watchDays: watchDays.size,
    totalShows: shows.length,
    episodesThisMonth,
    avgEpisodeRating,
    monthBuckets,
    hoursSeries,
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
