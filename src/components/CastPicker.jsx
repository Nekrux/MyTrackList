import { profileUrl } from '../lib/tmdb'

// cast: array di { name, profile_path, character }
// value: nome selezionato (stringa)
export default function CastPicker({ cast = [], value, onChange }) {
  return (
    <div>
      {cast.length > 0 && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
          {cast.map((c, i) => {
            const selected = value === c.name
            return (
              <button
                key={`${c.name}-${i}`}
                onClick={() => onChange(selected ? '' : c.name)}
                style={{
                  flexShrink: 0, width: 72, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 4, opacity: selected ? 1 : 0.85
                }}
              >
                <div style={{
                  width: 56, height: 56, overflow: 'hidden', background: 'var(--surface-hover)',
                  border: selected ? '2px solid var(--gold)' : '2px solid transparent'
                }}>
                  {c.profile_path ? (
                    <img src={profileUrl(c.profile_path)} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--subtext)' }}>?</div>
                  )}
                </div>
                <span style={{ fontSize: 10, textAlign: 'center', color: selected ? 'var(--gold)' : 'var(--subtext)', lineHeight: 1.2 }}>
                  {c.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <input
        type="text"
        placeholder="Oppure scrivi un nome libero..."
        value={cast.some(c => c.name === value) ? '' : (value || '')}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--overlay)', padding: 10, fontSize: 14 }}
      />
    </div>
  )
}
