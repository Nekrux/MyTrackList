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
    console.error('Errore catturato da ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',
          background: '#1e1e2e', color: '#cdd6f4', fontFamily: 'Outfit, sans-serif'
        }}>
          <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 28, marginBottom: 12, color: '#cba6f7', letterSpacing: '0.02em' }}>
            QUALCOSA È ANDATO STORTO
          </h1>
          <p style={{ fontSize: 13, color: '#a6adc8', marginBottom: 20, maxWidth: 320, lineHeight: 1.5 }}>
            Si è verificato un errore imprevisto nell'app. Ricarica la pagina per continuare — i dati già salvati non vengono persi.
          </p>
          <pre style={{
            fontSize: 11, color: '#f38ba8', maxWidth: 320, overflow: 'auto', marginBottom: 20,
            textAlign: 'left', background: '#313244', padding: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word'
          }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#cba6f7', color: '#1e1e2e', border: 'none', padding: '12px 28px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
          >
            Ricarica
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
