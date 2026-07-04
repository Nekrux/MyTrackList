import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { listShows } from '../lib/db'
import { Loader, Empty, Poster, Sheet } from '../components/ui'
import ConfirmInline from '../components/ConfirmInline'

export default function Lists() {
  const { user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [lists, setLists] = useState([])
  const [active, setActive] = useState(null)
  const [items, setItems] = useState([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [picker, setPicker] = useState(false)
  const [library, setLibrary] = useState([])

  const loadLists = async () => {
    const { data, error } = await supabase.from('user_lists').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    if (error) { toast.error(error.message); return }
    setLists(data || [])
    if (data?.length && !active) setActive(data[0].id)
    if (!data?.length) setActive(null)
    setLoading(false)
  }
  useEffect(() => { loadLists() }, [user.id])

  const loadItems = async (listId) => {
    if (!listId) { setItems([]); return }
    const { data, error } = await supabase.from('user_list_items').select('*').eq('list_id', listId).order('added_at', { ascending: false })
    if (error) return toast.error(error.message)
    setItems(data || [])
  }
  useEffect(() => { loadItems(active) }, [active])

  const createList = async () => {
    if (!name.trim()) return toast.error('Dai un nome alla lista.')
    const { data, error } = await supabase.from('user_lists').insert({ user_id: user.id, name: name.trim(), description: desc.trim() || null }).select().single()
    if (error) return toast.error(error.message)
    setName(''); setDesc(''); setCreating(false)
    setLists(l => [...l, data]); setActive(data.id)
    toast.success('Lista creata.')
  }

  const deleteList = async () => {
    const { error } = await supabase.from('user_lists').delete().eq('id', active)
    if (error) return toast.error(error.message)
    toast.success('Lista eliminata.')
    const remaining = lists.filter(l => l.id !== active)
    setLists(remaining); setActive(remaining[0]?.id || null)
  }

  const openPicker = async () => {
    try { setLibrary(await listShows(user.id)); setPicker(true) }
    catch (e) { toast.error(e.message) }
  }

  const inList = new Set(items.map(i => i.tmdb_id))
  const toggleItem = async (show) => {
    if (inList.has(show.tmdb_id)) {
      const { error } = await supabase.from('user_list_items').delete().eq('list_id', active).eq('tmdb_id', show.tmdb_id)
      if (error) return toast.error(error.message)
      setItems(items.filter(i => i.tmdb_id !== show.tmdb_id))
    } else {
      const { data, error } = await supabase.from('user_list_items')
        .insert({ list_id: active, user_id: user.id, tmdb_id: show.tmdb_id, title: show.title, poster_path: show.poster_path })
        .select().single()
      if (error) return toast.error(error.message)
      setItems([data, ...items])
    }
  }

  if (loading) return <Loader />

  const activeList = lists.find(l => l.id === active)

  return (
    <div className="page page-pad-top">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="section-title" style={{ fontSize: 30, margin: 0 }}>Liste</h1>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nuova</button>
      </div>

      {lists.length === 0 ? (
        <Empty title="Nessuna lista">Crea una lista tematica: "Da rivedere", "Consigliate", quello che vuoi.</Empty>
      ) : (
        <>
          <div className="chip-row" style={{ margin: '14px 0' }}>
            {lists.map(l => (
              <button key={l.id} className={'chip' + (active === l.id ? ' on' : '')} onClick={() => setActive(l.id)}>{l.name}</button>
            ))}
          </div>

          {activeList && (
            <>
              {activeList.description && <p className="subtext" style={{ fontSize: 13, marginBottom: 12 }}>{activeList.description}</p>}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <button className="btn btn-ghost" onClick={openPicker}>+ Aggiungi serie</button>
                <ConfirmInline label="Elimina lista" confirmLabel="Conferma" onConfirm={deleteList} className="btn btn-danger" />
              </div>

              {items.length === 0 ? (
                <Empty title="Lista vuota">Aggiungi serie dalla tua libreria.</Empty>
              ) : (
                <div className="grid-3">
                  {items.map(it => (
                    <div key={it.tmdb_id} className="li-item" onClick={() => nav(`/show/${it.tmdb_id}`)}>
                      <Poster path={it.poster_path} alt={it.title} width={'100%'} />
                      <div className="li-title">{it.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Crea lista */}
      <Sheet open={creating} onClose={() => setCreating(false)} title="Nuova lista">
        <label className="lbl">Nome</label>
        <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="es. Da rivedere" maxLength={60} />
        <label className="lbl">Descrizione (opzionale)</label>
        <textarea className="field" rows={2} value={desc} onChange={e => setDesc(e.target.value)} maxLength={200} />
        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={createList}>Crea lista</button>
      </Sheet>

      {/* Picker serie dalla libreria */}
      <Sheet open={picker} onClose={() => setPicker(false)} title="Aggiungi dalla libreria">
        {library.length === 0 ? <Empty title="Libreria vuota">Aggiungi prima qualche serie.</Empty> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {library.map(s => {
              const on = inList.has(s.tmdb_id)
              return (
                <button key={s.tmdb_id} className={'pick-row' + (on ? ' on' : '')} onClick={() => toggleItem(s)}>
                  <Poster path={s.poster_path} alt={s.title} width={40} />
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600 }}>{s.title}</span>
                  <span className="pick-mark">{on ? '✓' : '+'}</span>
                </button>
              )
            })}
          </div>
        )}
      </Sheet>

      <style>{`
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .li-item { cursor: pointer; }
        .li-title { font-size: 12px; font-weight: 600; margin-top: 5px; line-height: 1.15;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .pick-row { display: flex; align-items: center; gap: 10px; padding: 8px; background: var(--surface0); border: 1px solid transparent; }
        .pick-row.on { border-color: var(--mauve); }
        .pick-mark { width: 26px; height: 26px; display: grid; place-items: center; font-weight: 800; background: var(--surface1); color: var(--text); }
        .pick-row.on .pick-mark { background: var(--mauve); color: #1a1626; }
      `}</style>
    </div>
  )
}
