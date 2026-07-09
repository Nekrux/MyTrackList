import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PublicProfile() {
  const { username } = useParams()
  const [state, setState] = useState({ loading: true, profile: null, error: null })

  useEffect(() => {
    let active = true
    setState({ loading: true, profile: null, error: null })
    supabase
      .from('user_profiles')
      .select('username, display_name, bio, note, avatar_url, social_tvtime, social_mal, social_imdb')
      .eq('username', username)
      .eq('is_public', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        setState({ loading: false, profile: data ?? null, error: error?.message ?? null })
      })
    return () => { active = false }
  }, [username])

  if (state.loading) {
    return (
      <div className="splash">
        <span className="wordmark">MYTRACKLIST</span>
      </div>
    )
  }

  return (
    <div className="page-wrap" style={{ paddingBottom: 24 }}>
      {state.error && (
        <div className="banner banner-error mt-16">
          <span className="banner-tag">ERR</span>
          <span className="banner-msg mono">{state.error}</span>
        </div>
      )}

      {!state.error && !state.profile && (
        <div className="empty-state" style={{ marginTop: '30dvh' }}>
          <span className="overline">// 404</span>
          Profilo non trovato o non pubblico.
        </div>
      )}

      {state.profile && (
        <>
          <div className="card card-accent mt-16" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="avatar">
              {state.profile.avatar_url
                ? <img src={state.profile.avatar_url} alt="" />
                : (state.profile.display_name || state.profile.username).charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.04em', lineHeight: 1.1 }}>
                {state.profile.display_name || state.profile.username}
              </div>
              <div className="mono text-sm" style={{ color: 'var(--mauve)' }}>@{state.profile.username}</div>
              {state.profile.bio && <p className="text-sm text-sub mt-8">{state.profile.bio}</p>}
            </div>
          </div>

          <div className="section-head">
            <h2>STATISTICHE</h2>
            <span className="rule" />
            <span className="tag">fase 2</span>
          </div>
          <div className="empty-state">
            <span className="overline">// in costruzione</span>
            Le statistiche pubbliche arrivano con la Fase 2.
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <Link to="/" className="wordmark" style={{ fontSize: 20 }}>MYTRACKLIST</Link>
      </div>
    </div>
  )
}
