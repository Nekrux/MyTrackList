import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { supabaseConfigOk, missingEnv } from './lib/supabase'
import ErrorBoundary from './components/ErrorBoundary'
import BottomNav from './components/BottomNav'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import ChooseUsername from './pages/ChooseUsername'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import Lists from './pages/Lists'
import Profile from './pages/Profile'
import PublicProfile from './pages/PublicProfile'

function Splash() {
  return (
    <div className="splash">
      <span className="wordmark">MYTRACKLIST</span>
    </div>
  )
}

function ConfigMissing() {
  return (
    <div className="crash">
      <p className="overline">// configurazione mancante</p>
      <h1>Variabili d'ambiente assenti</h1>
      <pre>{missingEnv.join('\n')}</pre>
      <p className="text-sm text-sub">
        Aggiungile nelle impostazioni del progetto su Cloudflare Pages
        (Settings → Variables) e riesegui il deploy.
      </p>
    </div>
  )
}

// Rotte protette: servono sessione + profilo
function RequireAuth() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/auth" replace />
  if (!profile) return <Navigate to="/scegli-username" replace />
  return (
    <>
      <main className="page-wrap">
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}

function AuthGate() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Splash />
  if (session && profile) return <Navigate to="/" replace />
  if (session && !profile) return <Navigate to="/scegli-username" replace />
  return <AuthPage />
}

function UsernameGate() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Splash />
  if (!session) return <Navigate to="/auth" replace />
  if (profile) return <Navigate to="/" replace />
  return <ChooseUsername />
}

export default function App() {
  if (!supabaseConfigOk) {
    return (
      <ErrorBoundary>
        <ConfigMissing />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthGate />} />
              <Route path="/scegli-username" element={<UsernameGate />} />
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route element={<RequireAuth />}>
                <Route path="/" element={<Home />} />
                <Route path="/cerca" element={<Search />} />
                <Route path="/libreria" element={<Library />} />
                <Route path="/liste" element={<Lists />} />
                <Route path="/profilo" element={<Profile />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
