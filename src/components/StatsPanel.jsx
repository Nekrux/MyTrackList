import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { computeStats, buildTimeSeries } from '../lib/stats'
import { statusLabel, emotionLabel } from '../lib/constants'

const C = {
  mauve: '#cba6f7', lavender: '#b4befe', pink: '#f5c2e7', gold: '#f0c674',
  green: '#a6e3a1', blue: '#89b4fa', red: '#f38ba8', surface: '#313244', grid: '#45475a', text: '#a6adc8',
}
const TYPE_COLORS = { serie: C.mauve, anime: C.pink, cartone: C.blue }
const GRANS = [['giorni', 'Giorni'], ['settimane', 'Settimane'], ['mesi', 'Mesi'], ['anni', 'Anni']]

function Tip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#181825', border: '1px solid #45475a', padding: '6px 9px', fontSize: 12 }}>
      <div style={{ color: '#cdd6f4' }}>{label}</div>
      <div style={{ color: '#cba6f7', fontWeight: 700 }}>{payload[0].value}{unit || ''}</div>
    </div>
  )
}

function StatCard({ value, label, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-val" style={{ color: accent || 'var(--mauve)' }}>{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  )
}

export default function StatsPanel({ shows, episodes, details, seasons, variant = 'full' }) {
  const stats = useMemo(() => computeStats(shows, episodes, details, seasons), [shows, episodes, details, seasons])
  const [gran, setGran] = useState('mesi')
  const series = useMemo(() => buildTimeSeries(episodes, stats.runtimeByShow, stats.seasonMap, gran), [episodes, stats, gran])

  const axis = { tick: { fill: C.text, fontSize: 10 }, axisLine: { stroke: C.grid }, tickLine: false }

  if (!shows.length) {
    return <div className="empty"><div className="big">Ancora niente da mostrare</div><p>Le statistiche appaiono man mano che tracci episodi.</p></div>
  }

  const isPublic = variant === 'public'

  return (
    <div className="stats">
      {/* Cifre chiave */}
      <div className="stat-grid">
        <StatCard value={stats.oreTotali} label="Ore totali" accent={C.mauve} />
        <StatCard value={stats.serieTotali} label="Serie" accent={C.lavender} />
        <StatCard value={stats.episodiConRewatch} label="Episodi (con rewatch)" accent={C.pink} />
        {!isPublic && <StatCard value={stats.giorni} label="Giorni di visione" accent={C.blue} />}
        {!isPublic && <StatCard value={stats.episodiMese} label="Episodi questo mese" accent={C.green} />}
        {!isPublic && <StatCard value={stats.votoMedioEp ?? '—'} label="Voto medio ep." accent={C.gold} />}
      </div>
      {!isPublic && stats.stagioniRivisteCount > 0 && (
        <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          {stats.stagioniRivisteCount} stagioni riviste · {stats.rivisioniTotali} rivisioni totali
        </p>
      )}

      {/* Ore nel tempo (solo full) */}
      {!isPublic && (
        <section className="stat-block">
          <div className="stat-block-head">
            <h3>Ore nel tempo</h3>
            <div className="chip-row" style={{ padding: 0 }}>
              {GRANS.map(([k, l]) => <button key={k} className={'chip' + (gran === k ? ' on' : '')} onClick={() => setGran(k)}>{l}</button>)}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={series} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="oreg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.mauve} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={C.mauve} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.grid} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" {...axis} minTickGap={16} />
              <YAxis {...axis} width={38} />
              <Tooltip content={<Tip unit="h" />} />
              <Area type="monotone" dataKey="ore" stroke={C.mauve} strokeWidth={2} fill="url(#oreg)" />
            </AreaChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Episodi per mese (solo full) */}
      {!isPublic && (
        <section className="stat-block">
          <h3>Episodi per mese</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.episodiPerMese} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} width={38} allowDecimals={false} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(203,166,247,.08)' }} />
              <Bar dataKey="episodi" fill={C.lavender} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Torta tipologie */}
      {stats.perTipologia.length > 0 && (
        <section className="stat-block">
          <h3>Per tipologia</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ResponsiveContainer width="55%" height={150}>
              <PieChart>
                <Pie data={stats.perTipologia} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64} paddingAngle={2} stroke="none">
                  {stats.perTipologia.map((d, i) => <Cell key={i} fill={TYPE_COLORS[d.key] || C.mauve} />)}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {stats.perTipologia.map(d => (
                <div key={d.key} className="legend-row">
                  <span className="legend-dot" style={{ background: TYPE_COLORS[d.key] }} />
                  <span style={{ flex: 1 }}>{d.name}</span>
                  <span className="tabular muted">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Generi */}
      {stats.generiTop.length > 0 && (
        <section className="stat-block">
          <h3>Generi più visti</h3>
          <ResponsiveContainer width="100%" height={Math.max(120, stats.generiTop.length * 30)}>
            <BarChart data={stats.generiTop} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(203,166,247,.08)' }} />
              <Bar dataKey="value" fill={C.pink} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Top 5 */}
      {stats.top5.length > 0 && (
        <section className="stat-block">
          <h3>Le tue top 5</h3>
          {stats.top5.map((s, i) => (
            <div key={s.tmdb_id} className="top-row">
              <span className="top-rank">{i + 1}</span>
              <span className="top-title">{s.title}</span>
              <span className="top-score">{s.rating}/10</span>
            </div>
          ))}
        </section>
      )}

      {/* Istogrammi voti (solo full) */}
      {!isPublic && (
        <>
          <VotiHist title="Voti serie" data={stats.histSerie} color={C.gold} />
          <VotiHist title="Voti episodi" data={stats.histEp} color={C.mauve} />
          <VotiHist title="Media voti episodi per serie" data={stats.histMedieSerie} color={C.lavender} />
        </>
      )}

      {/* Emozioni (solo full) */}
      {!isPublic && stats.emozioniTop.length > 0 && (
        <section className="stat-block">
          <h3>Emozioni ricorrenti</h3>
          <div className="emo-stat-grid">
            {stats.emozioniTop.map(e => (
              <div key={e.emoji} className="emo-stat">
                <span className="emo-stat-e">{e.emoji}</span>
                <span className="emo-stat-n tabular">{e.n}</span>
                <span className="emo-stat-l muted">{emotionLabel(e.emoji)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Piattaforme (solo full) */}
      {!isPublic && stats.piattaformeTop.length > 0 && (
        <section className="stat-block">
          <h3>Piattaforme</h3>
          <ResponsiveContainer width="100%" height={Math.max(110, stats.piattaformeTop.length * 30)}>
            <BarChart data={stats.piattaformeTop} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(137,180,250,.08)' }} />
              <Bar dataKey="value" fill={C.blue} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Stato (solo full) */}
      {!isPublic && (
        <section className="stat-block">
          <h3>Per stato</h3>
          {Object.entries(stats.statusCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
            const max = Math.max(...Object.values(stats.statusCount))
            return (
              <div key={k} className="status-row">
                <span className="status-name">{statusLabel(k)}</span>
                <div className="status-bar"><i style={{ width: (v / max * 100) + '%' }} /></div>
                <span className="tabular muted" style={{ fontSize: 12 }}>{v}</span>
              </div>
            )
          })}
        </section>
      )}

      <style>{`
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
        .stat-card { background: var(--surface0); border: 1px solid var(--surface1); padding: 12px 8px; text-align: center; }
        .stat-val { font-family: var(--f-display); font-size: 30px; line-height: 1; letter-spacing: .02em; }
        .stat-lbl { font-size: 10.5px; color: var(--subtext); margin-top: 4px; line-height: 1.2; }
        .stat-block { margin-top: 18px; }
        .stat-block h3 { font-family: var(--f-display); font-size: 19px; letter-spacing: .04em; color: var(--text); margin-bottom: 10px; }
        .stat-block-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
        .stat-block-head h3 { margin: 0; }
        .legend-row { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 3px 0; }
        .legend-dot { width: 10px; height: 10px; flex: 0 0 auto; }
        .top-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid var(--surface0); }
        .top-rank { font-family: var(--f-display); font-size: 20px; color: var(--gold); width: 22px; }
        .top-title { flex: 1; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .top-score { color: var(--gold); font-weight: 700; font-size: 13px; }
        .emo-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .emo-stat { background: var(--surface0); border: 1px solid var(--surface1); padding: 10px 4px; text-align: center; }
        .emo-stat-e { font-size: 22px; display: block; }
        .emo-stat-n { font-family: var(--f-display); font-size: 20px; color: var(--mauve); display: block; }
        .emo-stat-l { font-size: 9.5px; display: block; }
        .status-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
        .status-name { width: 96px; font-size: 12px; }
        .status-bar { flex: 1; height: 8px; background: var(--surface1); overflow: hidden; }
        .status-bar > i { display: block; height: 100%; background: var(--grad-btn); }
      `}</style>
    </div>
  )
}

function VotiHist({ title, data, color }) {
  const empty = data.every(d => d.n === 0)
  if (empty) return null
  return (
    <section className="stat-block">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="#45475a" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="voto" tick={{ fill: '#a6adc8', fontSize: 10 }} axisLine={{ stroke: '#45475a' }} tickLine={false} />
          <YAxis tick={{ fill: '#a6adc8', fontSize: 10 }} axisLine={{ stroke: '#45475a' }} tickLine={false} width={38} allowDecimals={false} />
          <Tooltip content={<Tip />} cursor={{ fill: 'rgba(203,166,247,.08)' }} />
          <Bar dataKey="n" fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}
