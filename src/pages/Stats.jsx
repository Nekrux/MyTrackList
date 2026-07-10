import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { IMG } from '../lib/tmdb'
import { TYPE_LABEL, STATUS_LABEL } from '../lib/constants'
import SectionHead from '../components/SectionHead'

const AXIS = { fill: '#a6adc8', fontSize: 10 }
const GRID = '#313244'
const TOOLTIP_STYLE = {
  background: '#181825', border: '1px solid #45475a', borderRadius: 0,
  fontSize: 12, color: '#cdd6f4',
}
const MAUVE = '#cba6f7'
const TYPE_COLORS = { serie: '#cba6f7', anime: '#d4a843', cartone: '#fab387' }

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const MODES = [
  { id: 'g', label: 'Giorni', limit: 30 },
  { id: 's', label: 'Settimane', limit: 26 },
  { id: 'm', label: 'Mesi', limit: 24 },
  { id: 'a', label: 'Anni', limit: Infinity },
]

function aggregateHours(hoursByDay, mode) {
  const map = new Map()
  for (const { d, h } of hoursByDay) {
    let k
    if (mode === 'g') k = d
    else if (mode === 's') k = isoWeekKey(new Date(`${d}T00:00:00`))
    else if (mode === 'm') k = d.slice(0, 7)
    else k = d.slice(0, 4)
    map.set(k, (map.get(k) ?? 0) + Number(h))
  }
  const limit = MODES.find((m) => m.id === mode).limit
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, h]) => ({ k, h: Math.round(h * 10) / 10 }))
    .slice(-limit)
}

function last12Months() {
  const out = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

function histogram(rows) {
  const byR = Object.fromEntries((rows ?? []).map((x) => [x.r, x.n]))
  return Array.from({ length: 10 }, (_, i) => ({ r: i + 1, n: byR[i + 1] ?? 0 }))
}

function Histo({ data }) {
  return (
    <div className="chart-box" style={{ height: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="r" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(203,166,247,0.08)' }} />
          <Bar dataKey="n" fill={MAUVE} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Stats() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('m')

  useEffect(() => {
    let on = true
    supabase.rpc('get_stats').then(({ data: d, error: err }) => {
      if (!on) return
      if (err) { setError(err.message); return }
      setData(d)
    })
    return () => { on = false }
  }, [])

  const hoursSeries = useMemo(
    () => (data ? aggregateHours(data.hours_by_day ?? [], mode) : []),
    [data, mode]
  )

  const monthsSeries = useMemo(() => {
    if (!data) return []
    const byM = Object.fromEntries((data.eps_by_month ?? []).map((x) => [x.m, x.n]))
    return last12Months().map((m) => ({ m: m.slice(2), n: byM[m] ?? 0 }))
  }, [data])

  if (error) {
    return (
      <div className="banner banner-error mt-16">
        <span className="banner-tag">ERR</span>
        <span className="banner-msg mono">{error}</span>
      </div>
    )
  }
  if (!data) return <p className="overline mt-16">// calcolo statistiche…</p>

  const t = data.totals ?? {}
  const tiles = [
    [t.hours, 'ore totali'],
    [t.days, 'giorni di visione'],
    [t.shows, 'serie'],
    [t.eps_month, 'ep questo mese'],
    [t.eps_total_wr, 'ep totali (con rewatch)'],
    [t.rewatched_eps, 'episodi rivisti'],
    [t.rewatch_total, 'rivisioni totali'],
    [t.avg_ep_rating ?? '—', 'media voto ep'],
  ]

  const types = (data.types ?? []).map((x) => ({ name: TYPE_LABEL[x.t] ?? x.t, value: x.n, t: x.t }))
  const genres = [...(data.genres ?? [])].sort((a, b) => b.n - a.n)
  const platforms = [...(data.platforms ?? [])].sort((a, b) => b.n - a.n)
  const statuses = data.statuses ?? []
  const statusTotal = statuses.reduce((s, x) => s + x.n, 0)
  const emotions = data.emotions ?? []

  return (
    <>
      <div className="stat-tiles mt-16">
        {tiles.map(([num, lab]) => (
          <div key={lab} className="stat-tile">
            <div className="stat-num">{num ?? 0}</div>
            <div className="stat-lab">{lab}</div>
          </div>
        ))}
      </div>

      <SectionHead title="ORE NEL TEMPO" />
      <div className="tabs">
        {MODES.map((m) => (
          <button key={m.id} type="button" className={`tab${mode === m.id ? ' active' : ''}`}
            onClick={() => setMode(m.id)}>{m.label}</button>
        ))}
      </div>
      <div className="chart-box mt-8" style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hoursSeries} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="gradHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={MAUVE} stopOpacity={0.5} />
                <stop offset="100%" stopColor={MAUVE} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="k" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }}
              minTickGap={26} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="h" name="ore" stroke={MAUVE} strokeWidth={2}
              fill="url(#gradHours)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <SectionHead title="EPISODI PER MESE" tag="ultimi 12" />
      <div className="chart-box" style={{ height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthsSeries} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="m" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(203,166,247,0.08)' }} />
            <Bar dataKey="n" name="episodi" fill={MAUVE} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {types.length > 0 && (
        <>
          <SectionHead title="TIPOLOGIE" />
          <div className="pie-row">
            <div className="chart-box" style={{ height: 150, flex: '0 0 150px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={types} dataKey="value" nameKey="name" innerRadius={38} outerRadius={70}
                    stroke="#1e1e2e" strokeWidth={2}>
                    {types.map((x) => <Cell key={x.t} fill={TYPE_COLORS[x.t] ?? '#585b70'} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="legend">
              {types.map((x) => (
                <div key={x.t} className="legend-item">
                  <span className="legend-dot" style={{ background: TYPE_COLORS[x.t] }} />
                  <span>{x.name}</span>
                  <span className="mono text-sub">{x.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {genres.length > 0 && (
        <>
          <SectionHead title="GENERI" tag="top 8" />
          <div className="stack-8">
            {genres.map((g) => (
              <div key={g.g} className="bar-row">
                <span className="bar-label">{g.g}</span>
                <span className="bar-track"><i style={{ width: `${(g.n / genres[0].n) * 100}%` }} /></span>
                <span className="bar-num mono">{g.n}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHead title="VOTI SERIE" tag="1–10" />
      <Histo data={histogram(data.show_ratings)} />

      <SectionHead title="VOTI EPISODI" tag="1–10" />
      <Histo data={histogram(data.ep_ratings)} />

      <SectionHead title="MEDIA EP PER SERIE" tag="1–10" />
      <Histo data={histogram(data.avg_ep_per_show)} />

      {emotions.length > 0 && (
        <>
          <SectionHead title="EMOZIONI" tag="top 8" />
          <div className="emote-grid">
            {emotions.map((e) => (
              <div key={e.e} className="emote-tile">
                <span className="emote-emoji">{e.e.split(' ')[0]}</span>
                <span className="text-sm">{e.e.split(' ').slice(1).join(' ')}</span>
                <span className="emote-count mono">{e.n}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {platforms.length > 0 && (
        <>
          <SectionHead title="PIATTAFORME" tag="top 6" />
          <div className="stack-8">
            {platforms.map((p) => (
              <div key={p.p} className="bar-row">
                <span className="bar-label">{p.p}</span>
                <span className="bar-track"><i style={{ width: `${(p.n / platforms[0].n) * 100}%` }} /></span>
                <span className="bar-num mono">{p.n}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {statusTotal > 0 && (
        <>
          <SectionHead title="STATI" />
          <div className="stack-8">
            {statuses.map((s) => (
              <div key={s.s} className="bar-row">
                <span className="bar-label">{STATUS_LABEL[s.s] ?? s.s}</span>
                <span className="bar-track"><i style={{ width: `${(s.n / statusTotal) * 100}%` }} /></span>
                <span className="bar-num mono">{s.n}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {data.top_shows?.length > 0 && (
        <>
          <SectionHead title="MEGLIO VOTATE" tag="top 5" />
          <div className="stack-8">
            {data.top_shows.map((s) => (
              <Link key={s.tmdb_id} to={`/serie/${s.tmdb_id}`} className="top-row">
                {s.poster_path
                  ? <img className="top-poster" src={IMG(s.poster_path, 'w154')} alt="" loading="lazy" />
                  : <div className="top-poster poster-empty">{s.title.charAt(0)}</div>}
                <span className="top-title">{s.title}</span>
                <span className="chip chip-gold">★ {s.rating}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
