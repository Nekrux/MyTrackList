import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout  from './components/Layout'
import Auth    from './pages/Auth'
import Home    from './pages/Home'
import Search  from './pages/Search'
import Library from './pages/Library'
import Show    from './pages/ShowDetail'
import Stats   from './pages/Stats'

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )
  return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index         element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="library" element={<Library />} />
            <Route path="show/:id" element={<Show />} />
            <Route path="stats"  element={<Stats />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
