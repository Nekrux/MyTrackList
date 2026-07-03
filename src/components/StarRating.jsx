// StarRating: componente stelle riutilizzabile.
// max=5 (episodi, gialle) oppure max=10 (serie, gold)
export default function StarRating({ value = 0, max = 5, onChange, gold = false, size = 18 }) {
  const stars = Array.from({ length: max }, (_, i) => i + 1)
  return (
    <div className="star-row">
      {stars.map(n => (
        <span
          key={n}
          className={`star ${n <= value ? (gold ? 'gold-filled' : 'filled') : ''}`}
          style={{ fontSize: size }}
          onClick={() => onChange && onChange(n === value ? 0 : n)}
        >
          ★
        </span>
      ))}
    </div>
  )
}
