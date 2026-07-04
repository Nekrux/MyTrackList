// value: intero 1..10 (o null). half=true => 5 stelle a mezza stella (ogni metà = 1 punto).
// half=false => 10 stelle piene. In entrambi i casi il dato è già base 10.
function Star({ fill, size }) {
  const id = `sg-${Math.random().toString(36).slice(2)}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="var(--gold)" />
          <stop offset={`${fill * 100}%`} stopColor="var(--surface1)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l2.9 6.26 6.1.53-4.6 4.02 1.38 6.16L12 15.9 6.22 19l1.38-6.16-4.6-4.02 6.1-.53z"
        fill={`url(#${id})`} stroke="rgba(0,0,0,.25)" strokeWidth="0.5"
      />
    </svg>
  )
}

export default function StarRating({ value = 0, onChange, half = false, size = 30, readOnly = false }) {
  const v = value || 0
  const starsCount = half ? 5 : 10
  const pointsPerStar = half ? 2 : 1

  const setVal = (nv) => {
    if (readOnly || !onChange) return
    onChange(v === nv ? null : nv) // ri-tap sullo stesso valore = azzera
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'inline-flex', gap: 3 }}>
        {Array.from({ length: starsCount }, (_, i) => {
          const base = i * pointsPerStar
          const fill = Math.max(0, Math.min(1, (v - base) / pointsPerStar))
          if (half) {
            const leftVal = base + 1, rightVal = base + 2
            return (
              <div key={i} style={{ position: 'relative', width: size, height: size, cursor: readOnly ? 'default' : 'pointer' }}>
                <Star fill={fill} size={size} />
                {!readOnly && (
                  <>
                    <span onClick={() => setVal(leftVal)} style={{ position: 'absolute', inset: '0 50% 0 0' }} />
                    <span onClick={() => setVal(rightVal)} style={{ position: 'absolute', inset: '0 0 0 50%' }} />
                  </>
                )}
              </div>
            )
          }
          return (
            <div key={i} onClick={() => setVal(i + 1)} style={{ cursor: readOnly ? 'default' : 'pointer' }}>
              <Star fill={fill} size={size} />
            </div>
          )
        })}
      </div>
      <span className="tabular" style={{ fontFamily: 'var(--f-display)', fontSize: size * 0.72, color: v ? 'var(--gold)' : 'var(--muted)', minWidth: 42 }}>
        {v ? `${v}/10` : '—'}
      </span>
    </div>
  )
}
