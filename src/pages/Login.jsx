import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const action = mode === 'signin' ? signIn : signUp
    const { error } = await action(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else if (mode === 'signin') {
      navigate('/')
    } else {
      setError('Registrazione completata! Ora effettua l\'accesso.')
      setMode('signin')
    }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 42, textAlign: 'center', color: 'var(--mauve)', marginBottom: 4 }}>MyTrackList</h1>
      <p style={{ textAlign: 'center', color: 'var(--subtext)', marginBottom: 32, fontSize: 13 }}>
        Il tuo tracker personale di serie, anime e cartoni
      </p>

      <form onSubmit={handleSubmit} style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button className="btn block" type="submit" disabled={loading}>
          {loading ? 'Attendere...' : mode === 'signin' ? 'Accedi' : 'Registrati'}
        </button>
      </form>

      <button
        onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError('') }}
        style={{ marginTop: 20, textAlign: 'center', color: 'var(--mauve)', fontSize: 13 }}
      >
        {mode === 'signin' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
      </button>
    </div>
  )
}
