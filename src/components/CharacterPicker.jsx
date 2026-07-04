import { profileUrl } from '../lib/tmdb'

// cast: array normalizzato di { character, actor, profile_path }
// value/onChange operano sul NOME DEL PERSONAGGIO (non dell'attore).
export default function CharacterPicker({ cast = [], value = '', onChange }) {
  const list = cast.filter(c => c.character).slice(0, 30)
  return (
    <div>
      <div className="cp-grid">
        {list.map((c, i) => {
          const on = value === c.character
          return (
            <button key={i} className={'cp-cell' + (on ? ' on' : '')} onClick={() => onChange(on ? '' : c.character)}>
              <div className="cp-photo">
                {c.profile_path
                  ? <img src={profileUrl(c.profile_path)} alt="" loading="lazy" />
                  : <div className="cp-ph">{(c.character[0] || '?').toUpperCase()}</div>}
              </div>
              <div className="cp-name">{c.character}</div>
            </button>
          )
        })}
      </div>
      <input className="field" style={{ marginTop: 10 }} value={value} onChange={e => onChange(e.target.value)}
        placeholder="…oppure scrivi un personaggio" maxLength={80} />
      <style>{`
        .cp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-height: 230px; overflow-y: auto; }
        .cp-cell { text-align: center; padding: 4px; border: 1px solid transparent; background: var(--surface0); }
        .cp-cell.on { border-color: var(--gold); background: rgba(240,198,116,.12); }
        .cp-photo { width: 100%; aspect-ratio: 1; overflow: hidden; background: var(--surface1); }
        .cp-photo img { width: 100%; height: 100%; object-fit: cover; }
        .cp-ph { width: 100%; height: 100%; display: grid; place-items: center; color: var(--muted); font-family: var(--f-display); font-size: 22px; }
        .cp-name { font-size: 10.5px; line-height: 1.15; margin-top: 4px; color: var(--subtext);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .cp-cell.on .cp-name { color: var(--gold); font-weight: 600; }
      `}</style>
    </div>
  )
}
