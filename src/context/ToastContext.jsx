import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)
let nextId = 1

const TAGS = { success: 'OK', error: 'ERR', info: 'INFO' }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback((type, message, ms) => {
    const id = nextId++
    setToasts((t) => [...t.slice(-3), { id, type, message }])
    window.setTimeout(() => remove(id), ms ?? (type === 'error' ? 6000 : 3500))
  }, [remove])

  const toast = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <button key={t.id} type="button" className={`toast toast-${t.type}`} onClick={() => remove(t.id)}>
            <span className="toast-tag">{TAGS[t.type] ?? 'INFO'}</span>
            <span className="toast-msg">{t.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
