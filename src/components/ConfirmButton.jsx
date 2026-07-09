import { useEffect, useRef, useState } from 'react'

/**
 * Conferma distruttiva a due tap, inline.
 * Primo tap: si "arma" e mostra l'etichetta di conferma.
 * Secondo tap entro il timeout: esegue onConfirm.
 */
export default function ConfirmButton({
  label,
  confirmLabel = 'Conferma',
  onConfirm,
  className = 'btn',
  armedClassName = 'btn btn-danger',
  timeout = 3500,
  disabled = false,
}) {
  const [armed, setArmed] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function handleClick() {
    if (!armed) {
      setArmed(true)
      timer.current = window.setTimeout(() => setArmed(false), timeout)
      return
    }
    window.clearTimeout(timer.current)
    setArmed(false)
    onConfirm?.()
  }

  return (
    <button
      type="button"
      className={armed ? armedClassName : className}
      onClick={handleClick}
      disabled={disabled}
    >
      {armed ? confirmLabel : label}
    </button>
  )
}
