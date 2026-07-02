import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode,    setMode]    = useState('login')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [error,   setError]   = useState('')
  const [info,    setInfo]    = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const submit = async e => {
    e.preventDefault(); setError(''); setInfo(''); setLoading(true)
    try {
      let res
      if (mode === 'login') res = await supabase.auth.signInWithPassword({ email, password: pass })
      else res = await supabase.auth.signUp({ email, password: pass })
      if (res.error) throw res.error
      if (mode === 'signup') { setInfo('Controlla la tua email per confermare, poi accedi.'); setMode('login') }
      else nav('/')
    } catch(err) { setError(err.message || 'Errore') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">MYTRACKLIST</div>
        <div className="auth-sub">Traccia serie TV, anime e cartoni</div>
        {error && <div className="msg-error" style={{ marginBottom:12 }}>{error}</div>}
        {info  && <div className="msg-ok"    style={{ marginBottom:12 }}>{info}</div>}
        <form className="auth-form" onSubmit={submit}>
          <div>
            <div className="label">Email</div>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <div className="label">Password</div>
            <input className="input" type="password" value={pass} onChange={e=>setPass(e.target.value)} required minLength={6} autoComplete={mode==='login'?'current-password':'new-password'} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop:4 }}>
            {loading ? '...' : mode==='login' ? 'Accedi' : 'Registrati'}
          </button>
        </form>
        <div className="auth-switch">
          {mode==='login'
            ? <>Non hai un account? <button onClick={()=>setMode('signup')}>Registrati</button></>
            : <>Hai già un account? <button onClick={()=>setMode('login')}>Accedi</button></>}
        </div>
      </div>
    </div>
  )
}
