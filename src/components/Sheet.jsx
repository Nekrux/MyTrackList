import { useEffect } from 'react'

export default function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="overline">{title}</span>
          <button type="button" className="btn btn-sm" onClick={onClose}>Chiudi</button>
        </div>
        {children}
      </div>
    </div>
  )
}
