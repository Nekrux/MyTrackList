import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

let seq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const remove = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
    clearTimeout(timers.current[id]); delete timers.current[id]
  }, [])

  const push = useCallback((message, type = 'info', ms = 4200) => {
    const id = ++seq
    setToasts(t => [...t, { id, message: String(message), type }])
    timers.current[id] = setTimeout(() => remove(id), ms)
    return id
  }, [remove])

  const api = {
    toast: push,
    success: (m, ms) => push(m, 'success', ms),
    // gli errori restano più a lungo: mostrano il messaggio VERO (lezione #2)
    error: (m, ms = 7000) => push(m, 'error', ms),
    info: (m, ms) => push(m, 'info', ms),
    dismiss: remove,
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => remove(t.id)}>
            <span className="toast-ic">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}
            </span>
            <span className="toast-msg">{t.message}</span>
            <span className="toast-x">✕</span>
          </div>
        ))}
      </div>
      <style>{`
        .toast-wrap { position: fixed; left: 0; right: 0; bottom: calc(var(--nav-h) + var(--safe-b) + 12px);
          z-index: 9999; display: flex; flex-direction: column; gap: 8px; padding: 0 12px; align-items: center; pointer-events: none; }
        .toast { pointer-events: auto; width: 100%; max-width: 560px; display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 12px; background: var(--surface0); border-left: 4px solid var(--overlay);
          box-shadow: 0 10px 30px -10px rgba(0,0,0,.6); animation: toastIn .18s ease; cursor: pointer; }
        .toast-success { border-left-color: var(--green); }
        .toast-error   { border-left-color: var(--red); }
        .toast-info    { border-left-color: var(--mauve); }
        .toast-ic { flex: 0 0 auto; width: 20px; height: 20px; display: grid; place-items: center; font-weight: 800; font-size: 13px; color: #1a1626; }
        .toast-success .toast-ic { background: var(--green); }
        .toast-error   .toast-ic { background: var(--red); }
        .toast-info    .toast-ic { background: var(--mauve); }
        .toast-msg { flex: 1; font-size: 13.5px; line-height: 1.35; color: var(--text); word-break: break-word; }
        .toast-x { color: var(--muted); font-size: 11px; }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>
    </ToastCtx.Provider>
  )
}
