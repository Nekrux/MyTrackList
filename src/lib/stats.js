// =====================================================================
// Formula ore/episodi — INEQUIVOCABILE (brief sez. 8)
//   moltiplicatore_stagione = 1 + season_tracking.watch_count   (0 se assente -> 1)
//   ore_episodio  = (episode_runtime_minuti * moltiplicatore) / 60
//   ore_totali    = somma su tutti gli episodi visti
//   episodi_con_rewatch = somma dei moltiplicatori su tutti gli episodi visti
// La barra di progresso NON usa il moltiplicatore (misura copertura, non tempo).
// =====================================================================

const parseArr = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] } }

function seasonMultiplierMap(seasons) {
  const m = {}
  for (const s of seasons) {
    m[`${s.tmdb_show_id}:${s.season_number}`] = 1 + (s.watch_count || 0)
  }
  return m
}
export function multiplierFor(seasonMap, showId, seasonNumber) {
  return seasonMap[`${showId}:${seasonNumber}`] ?? 1
}

// Bucket temporale
function bucketKey(dateStr, gran) {
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  if (gran === 'anni') return `${y}`
  if (gran === 'mesi') return `${y}-${mo}`
  if (gran === 'settimane') {
    // settimana ISO (giovedì determina l'anno)
    const t = new Date(d); t.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
    const week1 = new Date(t.getFullYear(), 0, 4)
    const wk = 1 + Math.round(((t - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
    return `${t.getFullYear()}-W${String(wk).padStart(2, '0')}`
  }
  return `${y}-${mo}-${String(d.getDate()).padStart(2, '0')}` // giorni
}

export function buildTimeSeries(episodes, runtimeByShow, seasonMap, gran) {
  const acc = {}
  for (const ep of episodes) {
    if (!ep.watched_at) continue
    const key = bucketKey(ep.watched_at, gran)
    if (!key) continue
    const rt = runtimeByShow[ep.tmdb_show_id] || 0
    const mult = multiplierFor(seasonMap, ep.tmdb_show_id, ep.season_number)
    acc[key] = (acc[key] || 0) + (rt * mult) / 60
  }
  return Object.entries(acc)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([label, ore]) => ({ label, ore: Math.round(ore * 10) / 10 }))
}

export function computeStats(shows, episodes, details, seasons) {
  const seasonMap = seasonMultiplierMap(seasons)
  const runtimeByShow = {}
  const typeByShow = {}
  for (const s of shows) {
    runtimeByShow[s.tmdb_id] = s.episode_runtime || 0
    typeByShow[s.tmdb_id] = s.show_type || 'serie'
  }

  // --- ore totali + episodi con rewatch ---
  let oreTotali = 0
  let episodiConRewatch = 0
  for (const ep of episodes) {
    const rt = runtimeByShow[ep.tmdb_show_id] || 0
    const mult = multiplierFor(seasonMap, ep.tmdb_show_id, ep.season_number)
    oreTotali += (rt * mult) / 60
    episodiConRewatch += mult
  }

  // --- giorni di visione (date distinte) ---
  const giorni = new Set(episodes.map(e => e.watched_at).filter(Boolean)).size

  // --- episodi questo mese (conteggio grezzo) ---
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const episodiMese = episodes.filter(e => (e.watched_at || '').startsWith(ym)).length

  // --- stagioni riviste ---
  const stagioniRiviste = seasons.filter(s => (s.watch_count || 0) > 0)
  const stagioniRivisteCount = stagioniRiviste.length
  const rivisioniTotali = stagioniRiviste.reduce((a, s) => a + (s.watch_count || 0), 0)

  // --- voto medio episodi (base 10) ---
  const epRatings = details.map(d => d.rating).filter(r => r != null)
  const votoMedioEp = epRatings.length
    ? Math.round((epRatings.reduce((a, b) => a + b, 0) / epRatings.length) * 10) / 10
    : null

  // --- episodi per mese (ultimi 12, grezzo) ---
  const mesiKeys = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    mesiKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const epMeseMap = {}
  for (const e of episodes) {
    const k = (e.watched_at || '').slice(0, 7)
    if (k) epMeseMap[k] = (epMeseMap[k] || 0) + 1
  }
  const episodiPerMese = mesiKeys.map(k => ({
    label: k.slice(5) + '/' + k.slice(2, 4),
    episodi: epMeseMap[k] || 0,
  }))

  // --- torta tipologie ---
  const typeCount = { serie: 0, anime: 0, cartone: 0 }
  for (const s of shows) typeCount[s.show_type || 'serie'] = (typeCount[s.show_type || 'serie'] || 0) + 1
  const perTipologia = [
    { name: 'Serie TV', value: typeCount.serie, key: 'serie' },
    { name: 'Anime', value: typeCount.anime, key: 'anime' },
    { name: 'Cartoni', value: typeCount.cartone, key: 'cartone' },
  ].filter(x => x.value > 0)

  // --- generi più visti (top 8) ---
  const genreCount = {}
  for (const s of shows) {
    for (const g of parseArr(s.genres)) genreCount[g] = (genreCount[g] || 0) + 1
  }
  const generiTop = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  // --- 3 istogrammi voti (1..10) ---
  const emptyHist = () => Array.from({ length: 10 }, (_, i) => ({ voto: i + 1, n: 0 }))
  const histSerie = emptyHist()
  for (const s of shows) if (s.rating >= 1 && s.rating <= 10) histSerie[s.rating - 1].n++

  const histEp = emptyHist()
  for (const d of details) if (d.rating >= 1 && d.rating <= 10) histEp[d.rating - 1].n++

  // media voti episodi PER serie
  const perShowEp = {}
  for (const d of details) {
    if (d.rating == null) continue
    ;(perShowEp[d.tmdb_show_id] ||= []).push(d.rating)
  }
  const histMedieSerie = emptyHist()
  for (const arr of Object.values(perShowEp)) {
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length
    const bucket = Math.min(10, Math.max(1, Math.round(avg)))
    histMedieSerie[bucket - 1].n++
  }

  // --- emozioni (top 8) ---
  const emoCount = {}
  for (const d of details) for (const e of parseArr(d.emotions)) emoCount[e] = (emoCount[e] || 0) + 1
  const emozioniTop = Object.entries(emoCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([emoji, n]) => ({ emoji, n }))

  // --- piattaforme (top 6): episodio + principale show ---
  const platCount = {}
  for (const d of details) if (d.platform) platCount[d.platform] = (platCount[d.platform] || 0) + 1
  for (const s of shows) if (s.main_platform) platCount[s.main_platform] = (platCount[s.main_platform] || 0) + 1
  const piattaformeTop = Object.entries(platCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, value]) => ({ name, value }))

  // --- barre per stato ---
  const statusCount = {}
  for (const s of shows) statusCount[s.status] = (statusCount[s.status] || 0) + 1

  // --- top 5 serie meglio votate ---
  const top5 = [...shows].filter(s => s.rating != null)
    .sort((a, b) => b.rating - a.rating).slice(0, 5)

  return {
    oreTotali: Math.round(oreTotali * 10) / 10,
    giorni,
    serieTotali: shows.length,
    episodiMese,
    episodiConRewatch: Math.round(episodiConRewatch),
    episodiVistiGrezzi: episodes.length,
    stagioniRivisteCount,
    rivisioniTotali,
    votoMedioEp,
    episodiPerMese,
    perTipologia,
    generiTop,
    histSerie, histEp, histMedieSerie,
    emozioniTop,
    piattaformeTop,
    statusCount,
    top5,
    runtimeByShow, seasonMap,
  }
}
