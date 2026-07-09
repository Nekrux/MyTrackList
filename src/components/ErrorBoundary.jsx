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
    if (!this.state.error) return this.props.children

    const err = this.state.error
    const detail = [err?.message || String(err), err?.stack?.split('\n').slice(1, 4).join('\n')]
      .filter(Boolean)
      .join('\n')

    return (
      <div className="crash">
        <p className="overline">// ERRORE APPLICAZIONE</p>
        <h1>Qualcosa si è rotto</h1>
        <pre>{detail}</pre>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Ricarica
        </button>
      </div>
    )
  }
}
