import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home', icon: '⌂', end: true },
  { to: '/cerca', label: 'Cerca', icon: '⌕' },
  { to: '/libreria', label: 'Libreria', icon: '▤' },
  { to: '/liste', label: 'Liste', icon: '☰' },
  { to: '/profilo', label: 'Profilo', icon: '☺' }
]

export default function BottomNav() {
  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            style={({ isActive }) => ({
              ...styles.tab,
              color: isActive ? 'var(--mauve)' : 'var(--subtext)'
            })}
          >
            <span style={styles.icon}>{tab.icon}</span>
            <span style={styles.label}>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'var(--surface)',
    borderTop: '1px solid rgba(108,112,134,0.25)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    zIndex: 40
  },
  inner: {
    maxWidth: 720,
    margin: '0 auto',
    display: 'flex',
    height: 'var(--nav-height)'
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.02em'
  },
  icon: {
    fontSize: 20,
    lineHeight: 1
  },
  label: {
    textTransform: 'uppercase',
    fontSize: 10
  }
}
