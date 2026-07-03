import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { searchTv } from '../lib/tmdb'

function normalizeStatus(raw) {
  const s = (raw || '').toLowerCase()
  if (s.includes('watching') && !s.includes('stop')) return 'watching'
  if (s.includes('watched') || s.includes('completed') || s.includes('complete')) return 'completed'
  if (s.includes('plan') || s.includes('want') || s.includes('to watch')) return 'planned'
  if (s.includes('pause') || s.includes('hold')) return 'paused'
  if (s.includes('stop') || s.includes('drop')) return 'dropped'
  return 'planned'
}

function findColumn(fields, candidates) {
  return fields.find(f => candidates.some(c => f.toLowerCase().includes(c)))
}

export default function ImportTVTime() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const [rows, setRows] = useState(null)
  const [columns, setColumns] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' })
  const [results, setResults] = useState(null)

  function parseFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const fields = res.meta.fields || []
        const titleCol = findColumn(fields, ['show', 'title', 'name'])
        const statusCol = findColumn(fields, ['status'])
        const ratingCol = findColumn(fields, ['rating', 'score', 'vote'])
        if (!titleCol) {
          showToast('Non riesco a trovare una colonna con il nome della serie nel CSV.', 'error')
          return
        }
        setColumns({ titleCol, statusCol, ratingCol })
        setRows(res.data.filter(r => r[titleCol]?.trim()))
        setResults(null)
      },
      error: () => showToast('Errore nella lettura del file CSV.', 'error')
    })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  async function runImport() {
    if (!rows || !user) return
    setImporting(true)
    const log = { success: [], skipped: [], errors: [] }
    setProgress({ current: 0, total: rows.length, name: '' })

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const title = row[columns.titleCol]?.trim()
      setProgress({ current: i + 1, total: rows.length, name: title })
      try {
        const searchRes = await searchTv(title)
        const match = searchRes.results?.[0]
        if (!match) {
          log.skipped.push(`${title} — nessuna corrispondenza su TMDB`)
        } else {
          const status = normalizeStatus(row[columns.statusCol])
          const ratingRaw = columns.ratingCol ? parseFloat(row[columns.ratingCol]) : null
          const rating = ratingRaw && ratingRaw > 0 ? Math.min(10, Math.round(ratingRaw)) : null

          const { error } = await supabase.from('user_shows').upsert({
            user_id: user.id,
            tmdb_id: match.id,
            media_type: 'tv',
            status,
            rating,
            title: match.name,
            original_title: match.original_name,
            poster_path: match.poster_path,
            backdrop_path: match.backdrop_path,
            first_air_year: match.first_air_date ? parseInt(match.first_air_date.slice(0, 4)) : null,
            genres: JSON.stringify([]),
            watch_count: 1,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,tmdb_id' })

          if (error) log.errors.push(`${title} — ${error.message}`)
          else log.success.push(`${title} → ${match.name}`)
        }
      } catch (err) {
        log.errors.push(`${title} — ${err.message}`)
      }
      await new Promise(r => setTimeout(r, 300))
    }

    setResults(log)
    setImporting(false)
  }

  return (
    <div className="page">
      <div className="eyebrow">MyTrackList</div>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Importa da TVTime</h1>
      <p style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 20, lineHeight: 1.5 }}>
        TVTime non esporta dati su episodi, emozioni o personaggi preferiti — solo stato di visione e voto della serie.
        Il resto potrai aggiungerlo con il tempo direttamente in MyTrackList.
      </p>

      {!rows && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="card"
          style={{
            padding: 40, textAlign: 'center', cursor: 'pointer',
            borderColor: dragOver ? 'var(--mauve)' : undefined,
            borderStyle: 'dashed', borderWidth: 2
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>⇪</div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Trascina qui il tuo file CSV</p>
          <p style={{ fontSize: 12, color: 'var(--subtext)' }}>oppure tocca per selezionarlo</p>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} style={{ display: 'none' }} />
        </div>
      )}

      {rows && !results && (
        <>
          <h2 className="section-title">Anteprima ({rows.length} righe trovate)</h2>
          <div className="card" style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
            {rows.slice(0, 100).map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid rgba(108,112,134,0.15)', fontSize: 13 }}>
                <span>{r[columns.titleCol]}</span>
                <span style={{ color: 'var(--subtext)' }}>{r[columns.statusCol] || '—'}</span>
              </div>
            ))}
            {rows.length > 100 && (
              <div style={{ padding: 12, fontSize: 12, color: 'var(--subtext)', textAlign: 'center' }}>
                ...e altre {rows.length - 100} righe
              </div>
            )}
          </div>

          {importing ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span>Importazione in corso: {progress.name}</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn secondary" onClick={() => { setRows(null); setColumns(null) }}>Annulla</button>
              <button className="btn block" onClick={runImport}>Importa {rows.length} serie</button>
            </div>
          )}
        </>
      )}

      {results && (
        <>
          <h2 className="section-title">Risultati import</h2>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{results.success.length}</div>
              <div style={{ fontSize: 11, color: 'var(--subtext)' }}>Importate</div>
            </div>
            <div className="card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>{results.errors.length + results.skipped.length}</div>
              <div style={{ fontSize: 11, color: 'var(--subtext)' }}>Errori / saltate</div>
            </div>
          </div>

          {(results.errors.length > 0 || results.skipped.length > 0) && (
            <div className="card" style={{ padding: 12, maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
              {[...results.errors, ...results.skipped].map((line, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--red)', padding: '4px 0' }}>{line}</div>
              ))}
            </div>
          )}

          <button className="btn block" onClick={() => { setRows(null); setColumns(null); setResults(null) }}>Importa un altro file</button>
        </>
      )}
    </div>
  )
}
