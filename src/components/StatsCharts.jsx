import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Link } from 'react-router-dom'
import { posterUrl } from '../lib/tmdb'

const MAUVE = '#cba6f7'
const GOLD = '#d4a843'
const YELLOW = '#f9e2af'
const SUBTEXT = '#a6adc8'
const SURFACE = '#313244'
const PIE_COLORS = ['#cba6f7', '#d4a843', '#89b4fa', '#a6e3a1', '#f38ba8', '#f9e2af']

const tooltipStyle = { background: '#1e1e2e', border: '1px solid #45475a', fontSize: 12, color: '#cdd6f4' }
const axisStyle = { fontSize: 11, fill: SUBTEXT }

function ChartCard({ title, children }) {
  return (
    <div className="card" style={{ padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text)' }}>{title}</div>
      {children}
    </div>
  )
}

export default function StatsCharts({ stats, variant = 'full' }) {
  if (!stats) return null

  return (
    <div>
      {variant === 'full' && (
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--mauve)' }}>{stats.totalHours}h</div>
            <div style={{ fontSize: 11, color: 'var(--subtext)' }}>Ore guardate</div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--mauve)' }}>{stats.watchDays}</div>
            <div style={{ fontSize: 11, color: 'var(--subtext)' }}>Giorni di visione</div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--mauve)' }}>{stats.totalShows}</div>
            <div style={{ fontSize: 11, color: 'var(--subtext)' }}>Serie totali</div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--mauve)' }}>{stats.episodesThisMonth}</div>
            <div style={{ fontSize: 11, color: 'var(--subtext)' }}>Episodi questo mese</div>
          </div>
          {stats.avgEpisodeRating && (
            <div className="card" style={{ padding: 14, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{stats.avgEpisodeRating.toFixed(1)}/10</div>
              <div style={{ fontSize: 11, color: 'var(--subtext)' }}>Voto medio episodi</div>
            </div>
          )}
        </div>
      )}

      {variant === 'full' && (
        <ChartCard title="Episodi per mese">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.monthBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke={SURFACE} vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={{ stroke: SURFACE }} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={MAUVE} name="Episodi" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {stats.typeData?.length > 0 && (
        <ChartCard title="Serie per tipologia">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                {stats.typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12, color: SUBTEXT }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {stats.genreData?.length > 0 && (
        <ChartCard title="Generi più visti">
          <ResponsiveContainer width="100%" height={Math.max(160, stats.genreData.length * 28)}>
            <BarChart data={stats.genreData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={SURFACE} horizontal={false} />
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={MAUVE} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {variant === 'full' && (
        <>
          <ChartCard title="Voti serie (1–10)">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.showRatingBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke={SURFACE} vertical={false} />
                <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: SURFACE }} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={GOLD} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Voti episodi (1–5)">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.episodeRatingBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke={SURFACE} vertical={false} />
                <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: SURFACE }} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={YELLOW} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {stats.emotionData?.length > 0 && (
            <ChartCard title="Emozioni più provate">
              <div className="grid-2" style={{ gap: 8 }}>
                {stats.emotionData.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--surface-hover)' }}>
                    <span style={{ fontSize: 20 }}>{e.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{e.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--subtext)' }}>{e.count}×</div>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {stats.platformData?.length > 0 && (
            <ChartCard title="Piattaforme più usate">
              <ResponsiveContainer width="100%" height={Math.max(140, stats.platformData.length * 28)}>
                <BarChart data={stats.platformData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={SURFACE} horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={MAUVE} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {stats.statusData?.length > 0 && (
            <ChartCard title="Per stato">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.statusData.map(s => (
                  <div key={s.value}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>{s.label}</span>
                      <span style={{ color: 'var(--subtext)' }}>{s.count}</span>
                    </div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${s.pct}%` }} /></div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </>
      )}

      {stats.topRated?.length > 0 && (
        <ChartCard title="Top 5 serie meglio votate">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.topRated.map((s, i) => (
              <Link key={s.tmdb_id} to={`/serie/${s.tmdb_id}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--subtext)', width: 18 }}>{i + 1}</span>
                <div style={{ width: 32, aspectRatio: '2/3', overflow: 'hidden', background: 'var(--surface-hover)', flexShrink: 0 }}>
                  {s.poster_path && <img src={posterUrl(s.poster_path, 'w92')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <span style={{ flex: 1, fontSize: 13 }}>{s.title}</span>
                <span className="badge gold">{s.rating}/10</span>
              </Link>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  )
}
