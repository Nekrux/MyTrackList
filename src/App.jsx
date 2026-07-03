import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Spinner from './components/Spinner'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import Lists from './pages/Lists'
import ListDetail from './pages/ListDetail'
import ShowDetail from './pages/ShowDetail'
import Profile from './pages/Profile'
import PublicProfile from './pages/PublicProfile'
import ImportTVTime from './pages/ImportTVTime'

function Protected({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner label="Caricamento..." />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

export default function App() {
  const { loading } = useAuth()
  const location = useLocation()
  const hideNav = location.pathname === '/login' || location.pathname.startsWith('/u/')

  if (loading) return <Spinner label="Caricamento MyTrackList..." />

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/u/:username" element={<PublicProfile />} />

        <Route path="/" element={<Protected><Home /></Protected>} />
        <Route path="/cerca" element={<Protected><Search /></Protected>} />
        <Route path="/libreria" element={<Protected><Library /></Protected>} />
        <Route path="/liste" element={<Protected><Lists /></Protected>} />
        <Route path="/liste/:id" element={<Protected><ListDetail /></Protected>} />
        <Route path="/serie/:tmdbId" element={<Protected><ShowDetail /></Protected>} />
        <Route path="/profilo" element={<Protected><Profile /></Protected>} />
        <Route path="/profilo/import" element={<Protected><ImportTVTime /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  )
}
