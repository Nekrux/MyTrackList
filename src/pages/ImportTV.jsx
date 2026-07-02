import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { searchShows, airYear } from '../lib/tmdb'

const STATUS_MAP = {
  'watching':      'watching',
  'watched':       'completed',
  'to watch':      'plan_to_watch',
  'plan to watch': 'plan_to_watch',
  'not watching':  'dropped',
  'paused':        'paused',
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase())
  return lines.slice(1).map(line => {
    const vals = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch==='"') { inQ=!inQ }
      else if (ch===',' && !inQ) { vals.push(cur.trim()); cur='' }
      else cur+=ch
    }
    vals.push(cur.trim())
    const obj = {}
    headers.forEach((h,i) => { obj[h] = (vals[i]||'').replace(/^"|"$/g,'').trim() })
    return obj
  }).filter(r => r['show name'] || r['name'] || r['series name'])
}

export default function ImportTV() {
  const { user } = useAuth()
  const nav      = useNavigate()
  const fileRef  = useRef()
  const [over,    setOver]    = useState(false)
  const [phase,   setPhase]   = useState('idle') // idle | preview | importing | done
  const [rows,    setRows]    = useState([])
  const [progress,setProgress]= useState({ done:0, total:0, current:'' })
  const [errors,  setErrors]  = useState([])
  const [log,     setLog]     = useState([])

  const handleFile = file => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const parsed = parseCSV(e.target.result)
      setRows(parsed); setPhase('preview')
    }
    reader.readAsText(file, 'utf-8')
  }

  const onDrop = e => {
    e.preventDefault(); setOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const startImport = async () => {
    setPhase('importing')
    const errs = []; const logLines = []
    const total = rows.length

    for (let i=0; i<rows.length; i++) {
      const row   = rows[i]
      const title = row['show name']||row['name']||row['series name']||''
      if (!title) continue

      setProgress({ done:i, total, current:title })

      try {
        // Search TMDB
        const res = await searchShows(title)
        const match = res.results?.[0]
        if (!match) { errs.push(`Non trovata: ${title}`); continue }

        const rawStatus = (row['status']||row['watching status']||'').toLowerCase()
        const status    = STATUS_MAP[rawStatus]||'plan_to_watch'
        const rating    = parseInt(row['rating']||row['score']||'0')||null
        const validRating = rating && rating>=1 && rating<=10 ? rating : null

        const totalEps = parseInt(row['episodes']||'0')||0

        const payload = {
          user_id: user.id, tmdb_id: match.id, media_type: 'tv', status,
          rating: validRating, title: match.name||title,
          original_title: match.original_name||'',
          poster_path: match.poster_path||null,
          backdrop_path: match.backdrop_path||null,
          first_air_year: airYear(match.first_air_date),
          total_episodes: totalEps||0, episode_runtime: 25,
          updated_at: new Date().toISOString(),
        }

        await supabase.from('user_shows').upsert(payload, { onConflict:'user_id,tmdb_id' })
        logLines.push(`✓ ${title} → ${status}${validRating?` (★${validRating})`:''} `)
      } catch(err) {
        errs.push(`Errore su ${title}: ${err.message}`)
      }

      // Small delay to avoid rate limiting
      await new Promise(r=>setTimeout(r,300))
    }

    setProgress({ done:rows.length, total, current:'' })
    setErrors(errs); setLog(logLines); setPhase('done')
  }

  return (
    <div className="page">
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
        <button onClick={()=>nav('/profile')} style={{ background:'none',color:'var(--muted)',fontSize:20 }}>←</button>
        <h1 className="page-title" style={{ marginBottom:0 }}>IMPORT TVTIME</h1>
      </div>

      {phase==='idle' && (
        <>
          <div style={{ background:'var(--surface0)',border:'1px solid var(--surface1)',padding:14,marginBottom:14,fontSize:13,color:'var(--subtext)',lineHeight:1.6 }}>
            <strong style={{ color:'var(--text)' }}>Come esportare i dati da TVTime:</strong><br />
            1. Apri TVTime → Impostazioni (⚙️) → Privacy<br />
            2. Cerca "Export data" o "Download my data"<br />
            3. Attendi l'email con il link al CSV<br />
            4. Scarica il file <code style={{ color:'var(--mauve)' }}>shows.csv</code> e caricalo qui<br /><br />
            <strong style={{ color:'var(--yellow)' }}>Nota:</strong> TVTime esporta solo stato e voto serie. Emozioni, personaggi e piattaforme devono essere aggiunti a mano.
          </div>

          <div
            className={`import-drop${over?' over':''}`}
            onDragOver={e=>{e.preventDefault();setOver(true)}}
            onDragLeave={()=>setOver(false)}
            onDrop={onDrop}
            onClick={()=>fileRef.current.click()}
          >
            <svg style={{ width:40,height:40,margin:'0 auto',color:'var(--muted)',marginBottom:8 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p>Trascina il CSV qui<br />oppure clicca per scegliere il file</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={e=>handleFile(e.target.files[0])} />
        </>
      )}

      {phase==='preview' && (
        <>
          <div style={{ background:'var(--surface0)',border:'1px solid var(--surface1)',padding:12,marginBottom:14,fontSize:13 }}>
            <strong>{rows.length} serie trovate nel CSV.</strong> Verranno cercate su TMDB e aggiunte alla tua libreria. Le serie già presenti verranno aggiornate senza perdere i dati degli episodi.
          </div>
          <div style={{ maxHeight:300,overflowY:'auto',marginBottom:14,border:'1px solid var(--surface1)' }}>
            {rows.slice(0,50).map((r,i)=>(
              <div key={i} style={{ padding:'7px 12px',borderBottom:'1px solid var(--surface0)',fontSize:13,display:'flex',justifyContent:'space-between' }}>
                <span>{r['show name']||r['name']||r['series name']}</span>
                <span style={{ color:'var(--muted)',fontSize:11 }}>{r['status']||r['watching status']||'—'}</span>
              </div>
            ))}
            {rows.length>50 && <div style={{ padding:'7px 12px',fontSize:12,color:'var(--muted)' }}>...e altre {rows.length-50} serie</div>}
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-primary" onClick={startImport} style={{ flex:1 }}>Importa {rows.length} serie</button>
            <button className="btn btn-ghost" onClick={()=>setPhase('idle')}>Annulla</button>
          </div>
        </>
      )}

      {phase==='importing' && (
        <div style={{ textAlign:'center',padding:40 }}>
          <div className="spinner" style={{ margin:'0 auto 20px' }} />
          <div style={{ fontSize:14,color:'var(--text)',marginBottom:6 }}>
            {progress.done}/{progress.total} — {progress.current}
          </div>
          <div className="progress-bar" style={{ height:6,marginTop:12 }}>
            <div className="progress-fill" style={{ width:`${progress.total?progress.done/progress.total*100:0}%` }} />
          </div>
          <div style={{ fontSize:12,color:'var(--muted)',marginTop:8 }}>Non chiudere questa pagina...</div>
        </div>
      )}

      {phase==='done' && (
        <>
          <div className="msg-ok" style={{ marginBottom:14 }}>
            Import completato! {log.length} serie importate{errors.length>0?`, ${errors.length} errori`:''}.
          </div>
          {log.length>0 && (
            <div style={{ maxHeight:200,overflowY:'auto',marginBottom:12,border:'1px solid var(--surface1)',fontSize:12 }}>
              {log.map((l,i)=><div key={i} style={{ padding:'5px 10px',borderBottom:'1px solid var(--surface0)',color:'var(--subtext)' }}>{l}</div>)}
            </div>
          )}
          {errors.length>0 && (
            <div style={{ maxHeight:120,overflowY:'auto',marginBottom:12,border:'1px solid var(--danger)',fontSize:12 }}>
              {errors.map((e,i)=><div key={i} style={{ padding:'5px 10px',borderBottom:'1px solid rgba(243,139,168,.1)',color:'var(--red)' }}>{e}</div>)}
            </div>
          )}
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-primary" onClick={()=>nav('/library')} style={{ flex:1 }}>Vai alla libreria</button>
            <button className="btn btn-ghost" onClick={()=>{setPhase('idle');setRows([]);setLog([]);setErrors([])}}>Importa altro</button>
          </div>
        </>
      )}
    </div>
  )
}
