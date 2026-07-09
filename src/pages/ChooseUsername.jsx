import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export default function ChooseUsername() {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const cleaned = username.toLowerCase().trim()
  const valid = USERNAME_RE.test(cleaned)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid || busy) return
    setError(null)
    setBusy(true)

    const { error: err } = await supabase.from('user_profiles').insert({
      id: user.id,
      username: cleaned,
      display_name: cleaned,
    })

    if (err) {
      if (err.code === '23505') {
        setError(`Username già in uso, scegline un altro. (${err.message})`)
      } else {
        setError(err.message)
      }
      setBusy(false)
      return
    }

    toast.success('Profilo creato')
    await refreshProfile()
    // Il router porta automaticamente alla Home quando il profilo esiste
  }

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <div className="wordmark">MYTRACKLIST</div>
        <span className="overline">// ultimo passaggio</span>
      </div>

      <div className="auth-card card-accent">
        <p className="overline" style={{ marginBottom: 10 }}>Scegli username</p>
        <p className="text-sm text-sub" style={{ marginBottom: 16 }}>
          Sarà il tuo identificativo e l'indirizzo del profilo pubblico
          (<span className="mono">/u/username</span>). Non potrai cambiarlo facilmente.
        </p>

        {error && (
          <div className="banner banner-error">
            <span className="banner-tag">ERR</span>
            <span className="banner-msg mono">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="username">Username</label>
            <input
              id="username"
              className="input"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="es. nekrux"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="hint">3–20 caratteri: lettere minuscole, numeri, underscore.</p>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={!valid || busy}>
            {busy ? 'Attendi…' : 'Conferma'}
          </button>
        </form>
      </div>
    </div>
  )
}
