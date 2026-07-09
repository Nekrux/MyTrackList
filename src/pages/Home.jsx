import { useAuth } from '../context/AuthContext'

function SectionHead({ title, tag }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      <span className="rule" />
      {tag && <span className="tag">{tag}</span>}
    </div>
  )
}

export default function Home() {
  const { profile } = useAuth()
  const name = profile?.display_name || profile?.username || ''

  return (
    <>
      <div className="topbar">
        <span className="wordmark">MYTRACKLIST</span>
        <span className="chip chip-mauve">V3</span>
      </div>

      <div className="card card-accent mt-16">
        <p className="overline">// fase 1 — infrastruttura</p>
        <h1 className="page-title" style={{ margin: '8px 0 8px' }}>Ciao, {name}</h1>
        <p className="text-sm text-sub">
          Autenticazione, database e PWA sono operativi. Le sezioni Home, Cerca,
          Libreria e Liste si popolano con la Fase 2; l'import TVTime arriva con la Fase 4.
        </p>
      </div>

      <SectionHead title="IN CORSO" tag="0 serie" />
      <div className="empty-state">
        <span className="overline">// vuoto</span>
        Le serie che stai guardando compariranno qui.
      </div>

      <SectionHead title="TRENDING" tag="tmdb" />
      <div className="empty-state">
        <span className="overline">// fase 2</span>
        I titoli del momento da TMDB compariranno qui.
      </div>
    </>
  )
}
