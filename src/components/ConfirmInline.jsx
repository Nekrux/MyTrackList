import { useState, useRef, useEffect } from 'react'

// Pattern a due tap: "Elimina" -> "Conferma eliminazione". Sostituisce window.confirm.
export default function ConfirmInline({ label = 'Elimina', confirmLabel = 'Conferma', onConfirm, className = 'btn btn-danger', timeout = 3500 }) {
  const [armed, setArmed] = useState(false)
  const t = useRef(null)
  useEffect(() => () => clearTimeout(t.current), [])

  const click = (e) => {
    e.stopPropagation()
    if (!armed) {
      setArmed(true)
      t.current = setTimeout(() => setArmed(false), timeout)
    } else {
      clearTimeout(t.current)
      setArmed(false)
      onConfirm()
    }
  }
  return (
    <button className={armed ? 'btn btn-danger-solid' : className} onClick={click}>
      {armed ? confirmLabel : label}
    </button>
  )
}
