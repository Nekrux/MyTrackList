import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import StarRating from './StarRating'
import CharacterPicker from './CharacterPicker'
import ConfirmButton from './ConfirmButton'
import { STATUSES, TYPES, PLATFORMS, DEVICES } from '../lib/constants'
import { guessType } from '../lib/tmdb'

// show: dati TMDB · myShow: riga user_shows o null
export default function ShowSheet({ open, onClose, show, myShow, onSave, onRemove }) {
  const [status, setStatus] = useState('da_vedere')
  const [type, setType] = useState('serie')
  const [rating, setRating] = useState(null)
  const [favChar, setFavChar] = useState('')
  const [platform, setPlatform] = useState('')
  const [device, setDevice] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setStatus(myShow?.status ?? 'da_vedere')
    setType(myShow?.media_type ?? guessType(show))
    setRating(myShow?.rating ?? null)
    setFavChar(myShow?.fav_character ?? '')
    setPlatform(myShow?.main_platform ?? '')
    setDevice(myShow?.main_device ?? '')
    setNote(myShow?.note ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const people = (() => {
    const cast = show?.aggregate_credits?.cast ?? []
    const seen = new Set()
    const out = []
    for (const p of cast) {
      const character = (p.roles?.[0]?.character || '').trim()
      if (!character || seen.has(character)) continue
      seen.add(character)
      out.push({ key: `${p.id}-${character}`, character, profile_path: p.profile_path })
      if (out.length >= 24) break
    }
    return out
  })()

  async function save() {
    setSaving(true)
    const ok = await onSave({
      status,
      media_type: type,
      rating,
      fav_character: favChar || null,
      main_platform: platform || null,
      main_device: device || null,
      note: note || null,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={myShow ? 'Modifica serie' : 'Aggiungi alla libreria'}>
      <h2 className="sheet-title">{show?.name}</h2>

      <div className="field mt-16">
        <label className="label">Stato</label>
        <div className="chips">
          {STATUSES.map((s) => (
            <button key={s.id} type="button"
              className={`chip-btn${status === s.id ? ' on' : ''}`}
              onClick={() => setStatus(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">Tipo</label>
        <div className="chips">
          {TYPES.map((t) => (
            <button key={t.id} type="button"
              className={`chip-btn${type === t.id ? ' on' : ''}`}
              onClick={() => setType(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">Il tuo voto (1–10)</label>
        <StarRating value={rating} onChange={setRating} size={24} />
      </div>

      <div className="field">
        <label className="label">Personaggio preferito</label>
        <CharacterPicker
          people={people}
          value={favChar}
          onChange={setFavChar}
          freeValue={favChar}
          onFreeChange={setFavChar}
        />
      </div>

      <div className="field">
        <label className="label">Piattaforma principale</label>
        <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">—</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="field">
        <label className="label">Dispositivo principale</label>
        <div className="chips">
          {DEVICES.map((d) => (
            <button key={d} type="button"
              className={`chip-btn${device === d ? ' on' : ''}`}
              onClick={() => setDevice(device === d ? '' : d)}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">Nota</label>
        <textarea className="input" rows={3} value={note}
          onChange={(e) => setNote(e.target.value)} />
      </div>

      <button type="button" className="btn btn-primary btn-block" disabled={saving} onClick={save}>
        {saving ? 'Attendi…' : 'Salva'}
      </button>

      {myShow && (
        <div className="mt-16">
          <ConfirmButton
            label="Rimuovi dalla libreria"
            confirmLabel="Conferma rimozione (episodi inclusi)"
            className="btn btn-ghost btn-block"
            armedClassName="btn btn-danger btn-block"
            onConfirm={onRemove}
          />
        </div>
      )}
    </Sheet>
  )
}
