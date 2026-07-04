import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home', icon: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { to: '/cerca', label: 'Cerca', icon: 'M10 3a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 10 3zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z' },
  { to: '/libreria', label: 'Libreria', icon: 'M4 3h4v18H4zM10 3h4v18h-4zM16 4l4 1-3 16-4-1z' },
  { to: '/liste', label: 'Liste', icon: 'M4 6h2v2H4zM8 6h12v2H8zM4 11h2v2H4zM8 11h12v2H8zM4 16h2v2H4zM8 16h12v2H8z' },
  { to: '/profilo', label: 'Profilo', icon: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.7-9 6v1h18v-1c0-3.3-4-6-9-6z' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => 'nav-tab' + (isActive ? ' active' : '')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d={t.icon} /></svg>
          <span>{t.label}</span>
        </NavLink>
      ))}
      <style>{`
        .bottom-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 400;
          height: calc(var(--nav-h) + var(--safe-b)); padding-bottom: var(--safe-b);
          display: flex; background: var(--mantle); border-top: 1px solid var(--surface0);
          max-width: 640px; margin: 0 auto; }
        .nav-tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
          color: var(--muted); font-size: 10.5px; font-weight: 600; letter-spacing: .02em;
          transition: color .12s ease; position: relative; }
        .nav-tab.active { color: var(--mauve); }
        .nav-tab.active::before { content: ''; position: absolute; top: 0; width: 26px; height: 2px; background: var(--grad-btn); }
        .nav-tab:active { transform: translateY(1px); }
      `}</style>
    </nav>
  )
}
