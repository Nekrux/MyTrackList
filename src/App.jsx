import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useToast } from './context/ToastContext'
import { supabase } from './lib/supabase'
import { slug } from './lib/constants'
import BottomNav from './components/BottomNav'
import { Loader } from './components/ui'

import Auth from './pages/Auth'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import Lists from './pages/Lists'

// Pagine pesanti (recharts / jszip / papaparse) caricate on-demand
const Profile = lazy(() => import('./pages/Profile'))
const ShowDetail = lazy(() => import('./pages/ShowDetail'))
const ImportTVTime = lazy(() => import('./pages/ImportTVTime'))
const PublicProfile = lazy(() => import('./pages/PublicProfile'))

function Onboarding() {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [display, setDisplay] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async () => {
    const u = slug(username)
    if (u.length < 3) return toast.error('Username troppo corto (min 3 caratteri, solo lettere/numeri).')
    setBusy(true)
    const { error } = await supabase.from('user_profiles').insert({
      id: user.id, username: u, display_name: display || u, is_public: false,
    })
    setBusy(false)
    if (error) return toast.error(error.message) // messaggio VERO
    toast.success('Profilo creato.')
    refreshProfile()
  }

  return (
    <div className="page page-pad-top" style={{ maxWidth: 460, margin: '0 auto', paddingTop: 40 }}>
      <div className="eyebrow">Ultimo passo</div>
      <h1 className="section-title" style={{ fontSize: 34 }}>Scegli il tuo username</h1>
      <p className="subtext" style={{ marginBottom: 16 }}>Sarà l'indirizzo del tuo profilo pubblico: <span className="muted">/u/{slug(username) || 'username'}</span></p>
      <label className="lbl">Username</label>
      <input className="field" value={username} onChange={e => setUsername(e.target.value)} placeholder="es. kevin" maxLength={30} />
      <label className="lbl">Nome visualizzato (opzionale)</label>
      <input className="field" value={display} onChange={e => setDisplay(e.target.value)} placeholder="Come vuoi apparire" maxLength={60} />
      <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy} onClick={create}>
        {busy ? 'Creo…' : 'Crea profilo'}
      </button>
    </div>
  )
}

export default function App() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  // Rotta pubblica: profilo /u/:username accessibile sempre, anche senza login
  const isPublicRoute = location.pathname.startsWith('/u/')

  if (loading) return <div className="app-shell"><Loader label="Avvio…" /></div>

  if (isPublicRoute) {
    return (
      <Suspense fallback={<div className="app-shell"><Loader /></div>}>
        <Routes>
          <Route path="/u/:username" element={<PublicProfile />} />
        </Routes>
      </Suspense>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    )
  }

  if (!profile) return <div className="app-shell page-pad-top"><Onboarding /></div>

  return (
    <div className="app-shell">
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cerca" element={<Search />} />
          <Route path="/libreria" element={<Library />} />
          <Route path="/liste" element={<Lists />} />
          <Route path="/profilo" element={<Profile />} />
          <Route path="/import" element={<ImportTVTime />} />
          <Route path="/show/:tmdbId" element={<ShowDetail />} />
          <Route path="/auth" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <BottomNav />
    </div>
  )
}
