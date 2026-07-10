// Sistema di voto base 10 unificato.
// halves=true → 5 stelle con mezze stelle: ogni mezza = 1 punto (range 1–10).
// halves=false → 10 stelle piene (range 1–10).
// Nessuna conversione ×2 da nessuna parte: il valore è SEMPRE l'intero 1–10.

function Star({ fill, size }) {
  const path = 'M12 2.5l2.9 6.2 6.8.8-5 4.6 1.3 6.7-6-3.4-6 3.4 1.3-6.7-5-4.6 6.8-.8z'
  return (
    <span className="star" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <path d={path} fill="var(--surface1)" />
      </svg>
      {fill > 0 && (
        <span className="star-fill" style={{ width: `${fill * 100}%` }}>
          <svg viewBox="0 0 24 24" width={size} height={size}>
            <path d={path} fill="var(--gold)" />
          </svg>
        </span>
      )}
    </span>
  )
}

export default function StarRating({ value, onChange, halves = false, size = 26, readOnly = false }) {
  const starCount = halves ? 5 : 10
  const perStar = halves ? 2 : 1
  const v = value ?? 0

  function fillFor(i) {
    const start = i * perStar
    const got = Math.max(0, Math.min(perStar, v - start))
    return got / perStar
  }

  function set(points) {
    if (readOnly || !onChange) return
    onChange(points === v ? null : points) // ritocco sullo stesso valore = azzera
  }

  return (
    <div className={`stars${readOnly ? ' readonly' : ''}`} role={readOnly ? undefined : 'radiogroup'}>
      {Array.from({ length: starCount }, (_, i) => (
        <span key={i} className="star-slot" style={{ width: size, height: size }}>
          <Star fill={fillFor(i)} size={size} />
          {!readOnly && halves && (
            <>
              <button type="button" className="star-hit left" aria-label={`${i * 2 + 1}/10`}
                onClick={() => set(i * 2 + 1)} />
              <button type="button" className="star-hit right" aria-label={`${i * 2 + 2}/10`}
                onClick={() => set(i * 2 + 2)} />
            </>
          )}
          {!readOnly && !halves && (
            <button type="button" className="star-hit full" aria-label={`${i + 1}/10`}
              onClick={() => set(i + 1)} />
          )}
        </span>
      ))}
      {!readOnly && <span className="stars-value mono">{value ? `${value}/10` : '—'}</span>}
    </div>
  )
}
