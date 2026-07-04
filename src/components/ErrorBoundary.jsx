import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 460, width: '100%', background: 'var(--surface0)', border: '1px solid var(--surface1)', padding: 22 }}>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 30, color: 'var(--red)', letterSpacing: '.04em' }}>
              Qualcosa si è rotto
            </div>
            <p style={{ color: 'var(--subtext)', margin: '10px 0 14px', lineHeight: 1.5 }}>
              La pagina ha smesso di rispondere. Ecco l'errore esatto (utile per capire cosa è successo):
            </p>
            <pre style={{
              background: 'var(--mantle)', border: '1px solid var(--surface1)', color: 'var(--gold)',
              padding: 12, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflow: 'auto',
            }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => window.location.reload()}>
              Ricarica
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
