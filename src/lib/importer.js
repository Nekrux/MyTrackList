// ============================================================
// MyTrackList — Importer TVTime (logica pura, senza rete/DB)
// Mappature derivate dall'analisi dell'export reale:
// correlazioni tra generazioni di file + valenza media dei
// voti co-registrati. Tutte le funzioni sono testabili offline.
// ============================================================

// Unici file letti dallo zip. Tutto il resto (user.csv, token,
// sessioni, IP…) NON viene mai aperto.
export const IMPORT_FILES = {
  tracking: 'tracking-prod-records-v2.csv',
  watchedOn: 'watched_on_episode.csv',
  emotions: 'emotions-3-prod-episode_votes.csv',
  ratings: 'ratings-3-prod-episode_votes.csv',
  characters: 'show_character_episode_vote.csv',
  specials: 'user_show_special_status.csv',
  showRates: 'tv_show_rate.csv',
}

// VOTI (file ratings): l'id del voto È il valore, in tre blocchi
// generazionali dell'app. 1–5 = stelle dirette, 16–20 = stelle+15,
// 25–29 = stelle+24. In caso di doppio voto vince il blocco più
// recente (l'app più nuova).
export function ratingStars(id) {
  if (id >= 25 && id <= 29) return { stars: id - 24, gen: 3 }
  if (id >= 16 && id <= 20) return { stars: id - 15, gen: 2 }
  if (id >= 1 && id <= 5) return { stars: id, gen: 1 }
  return null
}

// EMOZIONI (file emotions): 26 id in due blocchi (13–24 vecchia app,
// 25–39 nuova). Stesso spazio numerico dei voti, ma il FILE di
// provenienza determina il tipo. Etichette non esportate da TVTime:
// proposta EURISTICA (commenti: occorrenze · voto medio co-registrato),
// modificabile riga per riga nel dry-run.
export const EMOTION_DEFAULTS = {
  13: '👌 Solido',       // 1770 · 4.37 · tap positivo di default (vecchia app)
  14: '😂 Divertente',   //  150 · 4.03
  15: '😢 Commovente',   //  226 · 3.78
  16: '😮 Sorpresa',     //   30 · 3.87
  17: '😮 Sorpresa',     //  raro
  18: '🤔 Riflessivo',   //  208 · 3.62
  19: '😴 Noioso',       //  143 · 3.62 · valenza più bassa del blocco vecchio
  20: '🔥 Epico',        //   66 · 4.27
  21: '❤️ Amato',        //   17 · 4.06
  22: '🤯 Mind-blown',   //  raro
  23: '💀 Devastante',   //  raro
  24: '❤️ Amato',        //   51 · 4.16
  25: '❤️ Amato',        //   59 · 4.22
  26: '😮 Sorpresa',     //  raro
  27: '🤔 Riflessivo',   //  raro
  28: '👌 Solido',       //  744 · 4.21 · tap positivo di default (nuova app)
  29: '😴 Noioso',       //  100 · 3.59 · valenza più bassa del blocco nuovo
  30: '😂 Divertente',   //  613 · 3.93
  31: '🔥 Epico',        //  205 · 4.56 · valenza più alta in assoluto
  32: '🤯 Mind-blown',   //   36 · 4.47
  33: '😍 Adorato',      // 1552 · 4.40 · dominante nuova app
  34: '😮 Sorpresa',     //   44 · 4.00
  35: '😢 Commovente',   //  413 · 3.93
  36: '💀 Devastante',   //  raro
  37: '❤️ Amato',        //  769 · 4.34
  38: '🤯 Mind-blown',   //  771 · 4.32
  39: '🤔 Riflessivo',   //   43 · 3.95
}
const EMOTION_ID_MIN = 13
const EMOTION_ID_MAX = 39

const norm = (s) => (s ?? '').trim().toLowerCase()

function parseCsv(papa, text) {
  const { data } = papa.parse(text, { header: true, skipEmptyLines: true })
  return data
}

// ------------------------------------------------------------
// 1) PARSING — da testi CSV a strutture indicizzate
// ------------------------------------------------------------
export function parseTvtime(texts, papa) {
  const log = []

  const seriesFlags = new Map()   // sid → { name, forLater, archived, followed }
  const episodes = new Map()      // "sid|s|e" → { sid, season, episode, watchCount, watchedAt }
  const epIndex = new Map()       // tvdbEpisodeId → epKey
  const nameToSid = new Map()     // nome normalizzato → sid

  const trackRows = parseCsv(papa, texts.tracking)
  for (const r of trackRows) {
    const key = r.key ?? ''
    if (key.startsWith('user-series')) {
      const sid = Number(r.s_id)
      if (!sid) continue
      seriesFlags.set(sid, {
        name: r.series_name,
        forLater: r.is_for_later === 'true',
        archived: r.is_archived === 'true',
        followed: r.is_followed === 'true',
      })
      if (r.series_name) nameToSid.set(norm(r.series_name), sid)
      continue
    }
    const isWatch = key.startsWith('watch-episode')
    const isRewatch = key.startsWith('rewatch-episode')
    if (!isWatch && !isRewatch) continue

    const sid = Number(r.s_id)
    const season = Number(r.season_number)
    const episode = Number(r.episode_number)
    if (!sid || Number.isNaN(season) || Number.isNaN(episode)) {
      log.push(`Riga tracking scartata (id mancanti): ${r.series_name} ${r.key}`)
      continue
    }
    const epKey = `${sid}|${season}|${episode}`
    if (r.series_name && !nameToSid.has(norm(r.series_name))) {
      nameToSid.set(norm(r.series_name), sid)
    }
    if (r.episode_id) epIndex.set(String(r.episode_id), epKey)

    let cur = episodes.get(epKey)
    if (!cur) {
      cur = { sid, season, episode, watchCount: 0, watchedAt: null, rewatches: 0 }
      episodes.set(epKey, cur)
    }
    if (isWatch) {
      // dedup: alcune righe watch sono duplicate → si tiene la data più vecchia
      if (!cur.watchedAt || (r.created_at && r.created_at < cur.watchedAt)) {
        cur.watchedAt = r.created_at || null
      }
    } else {
      cur.rewatches += 1
    }
  }
  for (const ep of episodes.values()) {
    ep.watchCount = 1 + ep.rewatches
  }

  // risolve un riferimento episodio: prima per episode_id, poi nome+S+E
  function resolveRef(episodeId, seriesName, season, episode) {
    if (episodeId && epIndex.has(String(episodeId))) return epIndex.get(String(episodeId))
    const sid = nameToSid.get(norm(seriesName))
    if (sid && season != null && episode != null) {
      const k = `${sid}|${Number(season)}|${Number(episode)}`
      if (episodes.has(k)) return k
    }
    return null
  }

  // --- voti: blocco più recente vince in caso di doppio voto -----
  const ratings = new Map()       // epKey → { value, gen }
  let ratingsUnresolved = 0
  for (const r of parseCsv(papa, texts.ratings)) {
    const suffix = Number((r.vote_key ?? '').split('-').pop())
    const epKey = resolveRef(r.episode_id, r.series_name, r.season_number, r.episode_number)
    if (!epKey) { ratingsUnresolved += 1; continue }
    const rs = ratingStars(suffix)
    if (!rs) {
      log.push(`Voto con id sconosciuto ${suffix}: ${r.series_name} S${r.season_number}E${r.episode_number}`)
      continue
    }
    const cur = ratings.get(epKey)
    if (!cur || rs.gen >= cur.gen) ratings.set(epKey, { value: rs.stars * 2, gen: rs.gen })
  }

  // --- emozioni -------------------------------------------------
  const emotionsRaw = new Map()   // epKey → Set(suffix)
  const emotionStats = new Map()  // suffix → { count, examples[] }
  let emotionsUnresolved = 0
  for (const r of parseCsv(papa, texts.emotions)) {
    const suffix = Number((r.vote_key ?? '').split('-').pop())
    const epKey = resolveRef(r.episode_id, r.series_name, r.season_number, r.episode_number)
    if (!epKey) { emotionsUnresolved += 1; continue }
    if (suffix < EMOTION_ID_MIN || suffix > EMOTION_ID_MAX) {
      log.push(`Emozione con id fuori intervallo ${suffix}: ${r.series_name} S${r.season_number}E${r.episode_number}`)
      continue
    }
    if (!emotionsRaw.has(epKey)) emotionsRaw.set(epKey, new Set())
    emotionsRaw.get(epKey).add(suffix)
    let st = emotionStats.get(suffix)
    if (!st) { st = { count: 0, examples: [] }; emotionStats.set(suffix, st) }
    st.count += 1
    if (st.examples.length < 3) {
      st.examples.push(`${r.series_name} S${r.season_number}E${r.episode_number}`)
    }
  }

  // --- piattaforme (watched_on) ----------------------------------
  const watchedOn = new Map()     // epKey → sourceId
  let watchedOnUnresolved = 0
  for (const r of parseCsv(papa, texts.watchedOn)) {
    const epKey = resolveRef(r.episode_id, r.tv_show_name, r.episode_season_number, r.episode_number)
    if (!epKey) { watchedOnUnresolved += 1; continue }
    watchedOn.set(epKey, Number(r.watched_on_source_id))
  }

  // --- personaggi preferiti per episodio --------------------------
  const charVotes = new Map()     // epKey → characterId (ultimo vince)
  const charIds = new Set()
  let charsUnresolved = 0
  for (const r of parseCsv(papa, texts.characters)) {
    const epKey = resolveRef(r.episode_id, r.tv_show_name, r.episode_season_number, r.episode_number)
    if (!epKey) { charsUnresolved += 1; continue }
    const cid = Number(r.show_character_id)
    if (!cid) continue
    charVotes.set(epKey, cid)
    charIds.add(cid)
  }

  // --- stati speciali + voti serie ---------------------------------
  const favoriteSids = []
  for (const r of parseCsv(papa, texts.specials)) {
    const sid = Number(r.tv_show_id)
    if (!sid) continue
    if (r.status === 'favorite') favoriteSids.push(sid)
    else if (r.status === 'for_later') {
      const f = seriesFlags.get(sid)
      if (f) f.forLater = true
      else seriesFlags.set(sid, { name: r.tv_show_name, forLater: true, archived: false, followed: false })
    }
    if (r.tv_show_name) nameToSid.set(norm(r.tv_show_name), sid)
  }

  const showRates = new Map()     // sid → 1-10 (scala 0.5–5 con mezzi punti → ×2)
  for (const r of parseCsv(papa, texts.showRates)) {
    const sid = Number(r.tv_show_id)
    const v = Math.round(parseFloat(r.rating) * 2)
    if (sid && v >= 1 && v <= 10) showRates.set(sid, v)
  }

  // serie presenti solo negli episodi (senza riga user-series)
  for (const ep of episodes.values()) {
    if (!seriesFlags.has(ep.sid)) {
      seriesFlags.set(ep.sid, { name: null, forLater: false, archived: false, followed: false })
    }
  }

  const unresolved = { ratings: ratingsUnresolved, emotions: emotionsUnresolved, watchedOn: watchedOnUnresolved, characters: charsUnresolved }

  return {
    seriesFlags, episodes, epIndex, nameToSid,
    ratings, emotionsRaw, emotionStats, watchedOn, charVotes, charIds,
    favoriteSids, showRates, unresolved, log,
  }
}

// ------------------------------------------------------------
// 2) PIANO DI SCRITTURA — dopo il matching TMDB
//    matches: Map sid → { tmdb: <show TMDB completo> } | null
// ------------------------------------------------------------
export function assemblePlan(parsed, matches, emotionMap, platformMap) {
  const plan = {
    shows: [], episodes: [], details: [], favorites: [],
    charPatches: [], showCharTop: [], unmatchedSeries: [], skippedVotes: 0,
  }
  const sidToTmdb = new Map()

  // episodi per serie
  const epsBySid = new Map()
  for (const ep of parsed.episodes.values()) {
    if (!epsBySid.has(ep.sid)) epsBySid.set(ep.sid, [])
    epsBySid.get(ep.sid).push(ep)
  }

  for (const [sid, flags] of parsed.seriesFlags) {
    const m = matches.get(sid)
    const eps = epsBySid.get(sid) ?? []
    if (!m?.tmdb) {
      plan.unmatchedSeries.push({ sid, name: flags.name ?? `tvdb:${sid}`, episodes: eps.length })
      continue
    }
    const show = m.tmdb
    sidToTmdb.set(sid, show.id)

    // Stato: tutte viste → completata; archiviata → abbandonata;
    // episodi visti → in corso; per dopo / mai iniziata → da vedere.
    const watchedRegular = eps.filter((e) => e.season > 0).length
    const total = show.number_of_episodes ?? 0
    let status
    if (eps.length === 0) status = 'da_vedere'
    else if (total > 0 && watchedRegular >= total) status = 'completata'
    else if (flags.archived) status = 'abbandonata'
    else status = 'in_corso'

    // piattaforma/dispositivo principali dalla prima registrazione trovata
    let mainPlatform = null
    let mainDevice = null
    for (const ep of eps) {
      const src = parsed.watchedOn.get(`${sid}|${ep.season}|${ep.episode}`)
      const pf = src != null ? platformMap[src] : null
      if (pf) { mainPlatform = pf.platform; mainDevice = pf.device; break }
    }

    plan.shows.push({
      sid, tmdbShow: show, status,
      rating: parsed.showRates.get(sid) ?? null,
      main_platform: mainPlatform,
      main_device: mainDevice,
    })
  }

  // episodi + dettagli
  for (const ep of parsed.episodes.values()) {
    const tmdbId = sidToTmdb.get(ep.sid)
    if (!tmdbId) continue
    const epKey = `${ep.sid}|${ep.season}|${ep.episode}`
    plan.episodes.push({
      tmdb_show_id: tmdbId,
      season_number: ep.season,
      episode_number: ep.episode,
      watch_count: ep.watchCount,
      watched_at: ep.watchedAt ? ep.watchedAt.replace(' ', 'T') + 'Z' : new Date().toISOString(),
    })

    const rating = parsed.ratings.get(epKey)?.value ?? null
    const suffixes = parsed.emotionsRaw.get(epKey)
    let emotions = null
    if (suffixes?.size) {
      const mapped = [...suffixes].map((s) => emotionMap[s]).filter(Boolean)
      const uniq = [...new Set(mapped)]
      if (uniq.length) emotions = JSON.stringify(uniq)
      if (mapped.length < suffixes.size) plan.skippedVotes += suffixes.size - mapped.length
    }
    const src = parsed.watchedOn.get(epKey)
    const pf = src != null ? platformMap[src] : null

    plan.details.push({
      tmdb_show_id: tmdbId,
      season_number: ep.season,
      episode_number: ep.episode,
      watched_date: ep.watchedAt ? ep.watchedAt.slice(0, 10) : null,
      rating,
      emotions,
      platform: pf?.platform ?? null,
      device: pf?.device ?? null,
    })
  }

  // preferite (ordine di comparsa)
  let pos = 1
  for (const sid of parsed.favoriteSids) {
    const tmdbId = sidToTmdb.get(sid)
    const m = matches.get(sid)
    if (!tmdbId || !m?.tmdb) continue
    plan.favorites.push({
      tmdb_id: tmdbId,
      title: m.tmdb.name,
      poster_path: m.tmdb.poster_path ?? null,
      position: pos++,
    })
  }

  // patch personaggi episodio + personaggio più votato per serie
  const charCountBySid = new Map() // sid → Map cid → count
  for (const [epKey, cid] of parsed.charVotes) {
    const [sidS, s, e] = epKey.split('|')
    const sid = Number(sidS)
    const tmdbId = sidToTmdb.get(sid)
    if (!tmdbId) continue
    plan.charPatches.push({
      tmdb_show_id: tmdbId,
      season_number: Number(s),
      episode_number: Number(e),
      characterId: cid,
    })
    if (!charCountBySid.has(sid)) charCountBySid.set(sid, new Map())
    const cm = charCountBySid.get(sid)
    cm.set(cid, (cm.get(cid) ?? 0) + 1)
  }
  for (const [sid, cm] of charCountBySid) {
    const top = [...cm.entries()].sort((a, b) => b[1] - a[1])[0]
    plan.showCharTop.push({ tmdb_id: sidToTmdb.get(sid), characterId: top[0] })
  }

  return plan
}

// Riepilogo per il dry-run
export function planSummary(parsed, plan) {
  const totalWatches = plan.episodes.reduce((s, e) => s + e.watch_count, 0)
  return {
    seriesMatched: plan.shows.length,
    seriesUnmatched: plan.unmatchedSeries.length,
    episodes: plan.episodes.length,
    totalWatches,
    rewatchExtra: totalWatches - plan.episodes.length,
    ratings: plan.details.filter((d) => d.rating != null).length,
    emotions: plan.details.filter((d) => d.emotions != null).length,
    platforms: plan.details.filter((d) => d.platform != null).length,
    favorites: plan.favorites.length,
    showRatings: plan.shows.filter((s) => s.rating != null).length,
    characters: plan.charPatches.length,
    charactersUnique: parsed.charIds.size,
    statuses: plan.shows.reduce((acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc }, {}),
    unresolved: parsed.unresolved,
  }
}
