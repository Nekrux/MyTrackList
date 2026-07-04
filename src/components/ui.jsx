import { useEffect } from 'react'
import { posterUrl } from '../lib/tmdb'

export function Loader({ label = 'Carico…' }) {
  return <div className="center-load"><div className="spinner" /><span>{label}</span></div>
}

export function Empty({ title = 'Niente qui', children }) {
  return <div className="empty"><div className="big">{title}</div>{children && <p>{children}</p>}</div>
}

export function Poster({ path, alt, width = 96, className = '' }) {
  const url = posterUrl(path)
  return (
    <div className={className} style={{ width, aspectRatio: '2 / 3', background: 'var(--surface1)', flex: '0 0 auto', overflow: 'hidden' }}>
      {url
        ? <img src={url} alt={alt || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 22 }}>▦</div>}
    </div>
  )
}

// Bottom sheet riutilizzabile
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])
  if (!open) return null
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="sheet-grip" />
          <div className="sheet-title-row">
            <h2 className="sheet-title">{title}</h2>
            <button className="sheet-close" onClick={onClose} aria-label="Chiudi">✕</button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
      <style>{`
        .sheet-overlay { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,.6);
          display: flex; align-items: flex-end; justify-content: center; animation: fade .15s ease; }
        .sheet { width: 100%; max-width: 640px; max-height: 92vh; background: var(--bg);
          border-top: 2px solid var(--surface1); display: flex; flex-direction: column; animation: up .2s ease; }
        .sheet-head { padding: 8px 14px 4px; border-bottom: 1px solid var(--surface0); position: sticky; top: 0; background: var(--bg); }
        .sheet-grip { width: 40px; height: 4px; background: var(--surface2); margin: 4px auto 8px; }
        .sheet-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 6px; }
        .sheet-title { font-size: 24px; letter-spacing: .03em; color: var(--text); line-height: 1.05; }
        .sheet-close { color: var(--subtext); font-size: 16px; width: 34px; height: 34px; }
        .sheet-body { padding: 14px 14px calc(20px + var(--safe-b)); overflow-y: auto; }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes up { from { transform: translateY(24px); opacity: .6 } to { transform: none; opacity: 1 } }
      `}</style>
    </div>
  )
}
