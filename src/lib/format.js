export function fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return '' }
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// "~45min" oppure "~40–60min"
export function fmtRuntimeRange(arr) {
  const a = (arr || []).filter(Boolean)
  if (!a.length) return null
  const mn = Math.min(...a), mx = Math.max(...a)
  return mn === mx ? `~${mn}min` : `~${mn}–${mx}min`
}

export function avgRuntime(show) {
  const a = (show.episode_run_time || []).filter(Boolean)
  if (a.length) return Math.round(a.reduce((s, x) => s + x, 0) / a.length)
  return show.last_episode_to_air?.runtime ?? null
}

export function starText(rating10) {
  if (rating10 == null) return null
  return (rating10 / 2).toFixed(rating10 % 2 ? 1 : 0)
}

export function parseJSONArray(text) {
  if (!text) return []
  try {
    const v = JSON.parse(text)
    return Array.isArray(v) ? v : []
  } catch { return [] }
}
