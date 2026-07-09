import { NavLink } from 'react-router-dom'

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M4 11 L12 4 L20 11 V20 H14 V15 H10 V20 H4 Z" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="4" y="4" width="11" height="11" />
      <path d="M15 15 L20 20" />
    </svg>
  )
}

function IconLibrary() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="4" y="4" width="7" height="7" />
      <rect x="13" y="4" width="7" height="7" />
      <rect x="4" y="13" width="7" height="7" />
      <rect x="13" y="13" width="7" height="7" />
    </svg>
  )
}

function IconLists() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="4" y="5" width="3" height="3" />
      <path d="M10 6.5 H20" />
      <rect x="4" y="10.5" width="3" height="3" />
      <path d="M10 12 H20" />
      <rect x="4" y="16" width="3" height="3" />
      <path d="M10 17.5 H20" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="8.5" y="4" width="7" height="7" />
      <path d="M4 20 V16 H20 V20" />
    </svg>
  )
}

const TABS = [
  { to: '/', end: true, label: 'Home', Icon: IconHome },
  { to: '/cerca', label: 'Cerca', Icon: IconSearch },
  { to: '/libreria', label: 'Libreria', Icon: IconLibrary },
  { to: '/liste', label: 'Liste', Icon: IconLists },
  { to: '/profilo', label: 'Profilo', Icon: IconProfile },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigazione principale">
      {TABS.map(({ to, end, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
