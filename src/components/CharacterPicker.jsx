import { IMG } from '../lib/tmdb'

// Griglia personaggi: foto + NOME DEL PERSONAGGIO (non dell'attore).
// people: [{ key, character, profile_path }]
export default function CharacterPicker({ people, value, onChange, freeValue, onFreeChange }) {
  return (
    <>
      {people.length > 0 && (
        <div className="char-grid">
          {people.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`char-tile${value === p.character ? ' on' : ''}`}
              onClick={() => onChange(value === p.character ? '' : p.character)}
            >
              {p.profile_path
                ? <img src={IMG(p.profile_path, 'w185')} alt="" loading="lazy" />
                : <span className="char-noimg">?</span>}
              <span className="char-name">{p.character}</span>
            </button>
          ))}
        </div>
      )}
      <div className="field mt-8">
        <label className="label">Oppure scrivi il personaggio</label>
        <input
          className="input"
          type="text"
          placeholder="Nome personaggio"
          value={freeValue}
          onChange={(e) => onFreeChange(e.target.value)}
        />
      </div>
    </>
  )
}
