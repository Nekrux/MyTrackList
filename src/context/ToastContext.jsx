import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <ToastView key={toast.id} toast={toast} onDone={() => setToast(null)} />}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve essere usato dentro ToastProvider')
  return ctx
}

const COLORS = {
  error: '#f38ba8',
  success: '#a6e3a1',
  info: '#cba6f7'
}

function ToastView({ toast, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 'calc(var(--nav-height) + 16px + env(safe-area-inset-bottom, 0px))',
        maxWidth: 688,
        margin: '0 auto',
        zIndex: 100,
        background: '#313244',
        borderLeft: `4px solid ${COLORS[toast.type] || COLORS.error}`,
        color: '#cdd6f4',
        padding: '12px 14px',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
      }}
      onClick={onDone}
    >
      <span>{toast.message}</span>
      <span style={{ color: '#a6adc8', fontSize: 16, lineHeight: 1 }}>✕</span>
    </div>
  )
}
