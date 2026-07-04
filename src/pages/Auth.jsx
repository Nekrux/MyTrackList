import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!email || !password) return toast.error('Inserisci email e password.')
    setBusy(true)
    const fn = mode === 'in' ? signIn : signUp
    const { error } = await fn(email.trim(), password)
    setBusy(false)
    if (error) return toast.error(error.message)
    if (mode === 'up') toast.success('Account creato. Ora sei dentro.')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, maxWidth: 460, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Il tuo tracker, i tuoi dati</div>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 56, lineHeight: .9, letterSpacing: '.03em',
          background: 'var(--grad-word)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
          MYTRACKLIST
        </div>
      </div>

      <div style={{ display: 'flex', marginBottom: 18 }}>
        <button className={'chip btn-block' + (mode === 'in' ? ' on' : '')} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('in')}>Accedi</button>
        <button className={'chip btn-block' + (mode === 'up' ? ' on' : '')} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('up')}>Registrati</button>
      </div>

      <label className="lbl">Email</label>
      <input className="field" type="email" autoCapitalize="none" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.it" />
      <label className="lbl">Password</label>
      <input className="field" type="password" value={password} onChange={e => setPassword(e.target.value)}
        placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && submit()} />

      <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} disabled={busy} onClick={submit}>
        {busy ? 'Attendi…' : mode === 'in' ? 'Accedi' : 'Crea account'}
      </button>
      <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginTop: 14 }}>
        La conferma email è disattivata: registrandoti entri subito.
      </p>
    </div>
  )
}
