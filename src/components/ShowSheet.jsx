import { useState } from 'react'
import { Sheet } from './ui'
import StarRating from './StarRating'
import CharacterPicker from './CharacterPicker'
import { STATUSES, SHOW_TYPES, PLATFORMS, DEVICES } from '../lib/constants'

// Modifica dati a livello di SERIE. onSave riceve i campi aggiornati.
export default function ShowSheet({ open, onClose, initial, cast = [], onSave, saving }) {
  const [status, setStatus] = useState(initial?.status || 'da_vedere')
  const [showType, setShowType] = useState(initial?.show_type || 'serie')
  const [rating, setRating] = useState(initial?.rating || null)
  const [character, setCharacter] = useState(initial?.fav_character || '')
  const [platform, setPlatform] = useState(initial?.main_platform || '')
  const [device, setDevice] = useState(initial?.main_device || '')
  const [note, setNote] = useState(initial?.note || '')

  const submit = () => onSave({
    status, show_type: showType, rating,
    fav_character: character || null, main_platform: platform || null, main_device: device || null, note: note || null,
  })

  return (
    <Sheet open={open} onClose={onClose} title="Modifica serie">
      <label className="lbl">Stato</label>
      <div className="chip-row" style={{ flexWrap: 'wrap' }}>
        {STATUSES.map(s => <button key={s.key} className={'chip' + (status === s.key ? ' on' : '')} onClick={() => setStatus(s.key)}>{s.label}</button>)}
      </div>

      <label className="lbl">Tipo</label>
      <div className="chip-row">
        {SHOW_TYPES.map(t => <button key={t.key} className={'chip' + (showType === t.key ? ' on' : '')} onClick={() => setShowType(t.key)}>{t.label}</button>)}
      </div>

      <label className="lbl">Il tuo voto (serie)</label>
      <StarRating value={rating} onChange={setRating} half={false} size={24} />

      <label className="lbl">Personaggio preferito (serie)</label>
      <CharacterPicker cast={cast} value={character} onChange={setCharacter} />

      <label className="lbl">Piattaforma principale</label>
      <div className="chip-row" style={{ flexWrap: 'wrap' }}>
        {PLATFORMS.map(p => <button key={p} className={'chip' + (platform === p ? ' on' : '')} onClick={() => setPlatform(platform === p ? '' : p)}>{p}</button>)}
      </div>

      <label className="lbl">Dispositivo principale</label>
      <div className="chip-row">
        {DEVICES.map(d => <button key={d} className={'chip' + (device === d ? ' on' : '')} onClick={() => setDevice(device === d ? '' : d)}>{d}</button>)}
      </div>

      <label className="lbl">Nota</label>
      <textarea className="field" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Pensieri sulla serie…" />

      <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={saving} onClick={submit}>
        {saving ? 'Salvo…' : 'Salva'}
      </button>
    </Sheet>
  )
}
