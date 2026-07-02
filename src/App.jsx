import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout        from './components/Layout'
import Auth          from './pages/Auth'
import Home          from './pages/Home'
import Search        from './pages/Search'
import Library       from './pages/Library'
import ShowDetail    from './pages/ShowDetail'
import Profile       from './pages/Profile'
import PublicProfile from './pages/PublicProfile'
import Lists         from './pages/Lists'
import ImportTV      from './pages/ImportTV'

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth"        element={<Auth />} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index               element={<Home />} />
            <Route path="search"       element={<Search />} />
            <Route path="library"      element={<Library />} />
            <Route path="show/:id"     element={<ShowDetail />} />
            <Route path="profile"      element={<Profile />} />
            <Route path="lists"        element={<Lists />} />
            <Route path="import"       element={<ImportTV />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
