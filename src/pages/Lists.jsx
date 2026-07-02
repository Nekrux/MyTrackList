import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { imgUrl } from '../lib/tmdb'

export default function Lists() {
  const { user } = useAuth()
  const nav      = useNavigate()
  const [lists,    setLists]    = useState([])
  const [active,   setActive]   = useState(null) // list id
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [newName,  setNewName]  = useState('')
  const [newDesc,  setNewDesc]  = useState('')
  const [creating, setCreating] = useState(false)
  const [myShows,  setMyShows]  = useState([])
  const [addSearch,setAddSearch]= useState('')
  const [addMode,  setAddMode]  = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const [{ data:ls }, { data:shows }] = await Promise.all([
      supabase.from('user_lists').select('*').eq('user_id',user.id).order('created_at',{ascending:false}),
      supabase.from('user_shows').select('tmdb_id,title,poster_path,first_air_year').eq('user_id',user.id).order('title'),
    ])
    setLists(ls||[]); setMyShows(shows||[])
    if (ls?.length && !active) openList(ls[0].id, ls[0])
    setLoading(false)
  }

  const openList = async (id) => {
    setActive(id); setAddMode(false); setAddSearch('')
    const { data } = await supabase.from('user_list_items').select('*').eq('list_id',id).order('added_at',{ascending:false})
    setItems(data||[])
  }

  const createList = async () => {
    if (!newName.trim()) return
    const { data } = await supabase.from('user_lists').insert({ user_id:user.id, name:newName.trim(), description:newDesc.trim()||null }).select().single()
    if (data) { setLists(p=>[data,...p]); openList(data.id); setNewName(''); setNewDesc(''); setCreating(false) }
  }

  const deleteList = async id => {
    if (!confirm('Eliminare questa lista?')) return
    await supabase.from('user_lists').delete().eq('id',id).eq('user_id',user.id)
    setLists(p=>p.filter(l=>l.id!==id))
    if (active===id) { setActive(null); setItems([]) }
  }

  const addItem = async show => {
    if (items.find(i=>i.tmdb_id===show.tmdb_id)) return
    const { data } = await supabase.from('user_list_items').insert({ list_id:active, user_id:user.id, tmdb_id:show.tmdb_id, title:show.title, poster_path:show.poster_path }).select().single()
    if (data) setItems(p=>[data,...p])
  }

  const removeItem = async tmdbId => {
    await supabase.from('user_list_items').delete().eq('list_id',active).eq('tmdb_id',tmdbId)
    setItems(p=>p.filter(i=>i.tmdb_id!==tmdbId))
  }

  const filtered = myShows.filter(s=>s.title.toLowerCase().includes(addSearch.toLowerCase()))
  const activeList = lists.find(l=>l.id===active)

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
        <h1 className="page-title" style={{ marginBottom:0 }}>LISTE</h1>
        <button className="btn btn-primary btn-sm" onClick={()=>setCreating(p=>!p)}>+ Nuova lista</button>
      </div>

      {/* New list form */}
      {creating && (
        <div style={{ background:'var(--surface0)',border:'1px solid var(--surface1)',padding:14,marginBottom:14 }}>
          <div className="sheet-row">
            <div className="label">Nome lista</div>
            <input className="input" placeholder="Es. Serie italiane" value={newName} onChange={e=>setNewName(e.target.value)} />
          </div>
          <div className="sheet-row">
            <div className="label">Descrizione (opzionale)</div>
            <input className="input" placeholder="..." value={newDesc} onChange={e=>setNewDesc(e.target.value)} />
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-primary btn-sm" onClick={createList}>Crea</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setCreating(false)}>Annulla</button>
          </div>
        </div>
      )}

      {lists.length===0 ? (
        <div className="empty-state"><p>Nessuna lista ancora.<br />Creane una!</p></div>
      ) : (
        <>
          {/* List selector */}
          <div className="tabs" style={{ marginBottom:14 }}>
            {lists.map(l=>(
              <button key={l.id} className={`tab${active===l.id?' active':''}`} onClick={()=>openList(l.id)}>{l.name}</button>
            ))}
          </div>

          {activeList && (
            <>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
                <div>
                  <div style={{ fontFamily:'Bebas Neue',fontSize:'1.3rem' }}>{activeList.name}</div>
                  {activeList.description && <div style={{ fontSize:12,color:'var(--muted)' }}>{activeList.description}</div>}
                </div>
                <div style={{ display:'flex',gap:6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setAddMode(p=>!p)}>+ Aggiungi</button>
                  <button className="btn btn-sm" style={{ background:'none',color:'var(--red)',border:'1px solid var(--red)' }} onClick={()=>deleteList(active)}>✕</button>
                </div>
              </div>

              {/* Add show from library */}
              {addMode && (
                <div style={{ background:'var(--surface0)',border:'1px solid var(--surface1)',padding:12,marginBottom:12 }}>
                  <input className="input" placeholder="Cerca nelle tue serie..." value={addSearch} onChange={e=>setAddSearch(e.target.value)} style={{ marginBottom:8 }} />
                  <div style={{ display:'flex',flexDirection:'column',gap:5,maxHeight:220,overflowY:'auto' }}>
                    {filtered.slice(0,10).map(s=>(
                      <button key={s.tmdb_id} className="show-card"
                        style={{ opacity:items.find(i=>i.tmdb_id===s.tmdb_id)?0.4:1 }}
                        onClick={()=>addItem(s)}>
                        <div className="show-card-poster">
                          {s.poster_path?<img src={imgUrl(s.poster_path,'w185')} alt={s.title} />:<span>—</span>}
                        </div>
                        <div className="show-card-info">
                          <div className="show-card-title">{s.title}</div>
                          <div className="show-card-meta">{s.first_air_year}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              {items.length===0
                ? <div className="empty-state"><p>Lista vuota. Aggiiungi serie dalla tua libreria.</p></div>
                : <div className="show-grid">
                    {items.map(item=>(
                      <button key={item.tmdb_id} className="show-card" onClick={()=>nav(`/show/${item.tmdb_id}`)}>
                        <div className="show-card-poster">
                          {item.poster_path?<img src={imgUrl(item.poster_path,'w185')} alt={item.title} />:<span>—</span>}
                        </div>
                        <div className="show-card-info">
                          <div className="show-card-title">{item.title}</div>
                        </div>
                        <button onClick={e=>{e.stopPropagation();removeItem(item.tmdb_id)}} style={{ background:'none',color:'var(--red)',padding:'0 4px',fontSize:16,flexShrink:0 }}>✕</button>
                      </button>
                    ))}
                  </div>
              }
            </>
          )}
        </>
      )}
    </div>
  )
}
