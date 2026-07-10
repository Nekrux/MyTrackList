import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { IMG } from '../lib/tmdb'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import SectionHead from '../components/SectionHead'
import ConfirmButton from '../components/ConfirmButton'
import Sheet from '../components/Sheet'

export default function Lists() {
  const { user } = useAuth()
  const toast = useToast()
  const [lists, setLists] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [library, setLibrary] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let on = true
    supabase.from('user_lists').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (!on) return
        if (err) { setError(err.message); return }
        setLists(data ?? [])
        if (data?.length) setActiveId((cur) => cur ?? data[0].id)
      })
    return () => { on = false }
  }, [user.id])

  useEffect(() => {
    if (activeId == null) { setItems(null); return undefined }
    let on = true
    setItems(null)
    setEditMode(false)
    supabase.from('user_list_items').select('*').eq('list_id', activeId)
      .order('added_at', { ascending: true }).limit(1000)
      .then(({ data, error: err }) => {
        if (!on) return
        if (err) { setError(err.message); return }
        setItems(data ?? [])
      })
    return () => { on = false }
  }, [activeId])

  const activeList = lists?.find((l) => l.id === activeId) ?? null

  async function createList(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    const { data, error: err } = await supabase.from('user_lists')
      .insert({ user_id: user.id, name: n, description: desc.trim() || null })
      .select().single()
    if (err) { toast.error(`Nuova lista: ${err.message}`); return }
    setLists((cur) => [...(cur ?? []), data])
    setActiveId(data.id)
    setCreating(false)
    setName('')
    setDesc('')
    toast.success('Lista creata')
  }

  async function deleteList() {
    const { error: err } = await supabase.from('user_lists').delete().eq('id', activeId)
    if (err) { toast.error(`Elimina lista: ${err.message}`); return }
    setLists((cur) => cur.filter((l) => l.id !== activeId))
    setActiveId(null)
    setItems(null)
    toast.success('Lista eliminata')
  }

  async function openAdd() {
    setAddOpen(true)
    setFilter('')
    if (!library) {
      const { data, error: err } = await supabase.from('user_shows')
        .select('tmdb_id, title, poster_path, first_air_year')
        .eq('user_id', user.id).order('title', { ascending: true }).limit(1000)
      if (err) { toast.error(`Libreria: ${err.message}`); return }
      setLibrary(data ?? [])
    }
  }

  async function addItem(show) {
    const { data, error: err } = await supabase.from('user_list_items')
      .upsert({
        list_id: activeId, user_id: user.id,
        tmdb_id: show.tmdb_id, title: show.title, poster_path: show.poster_path ?? null,
      }, { onConflict: 'list_id,tmdb_id', ignoreDuplicates: true })
      .select()
    if (err) { toast.error(`Aggiungi: ${err.message}`); return }
    if (data?.length) {
      setItems((cur) => [...(cur ?? []), data[0]])
      toast.success(`"${show.title}" aggiunta`)
    } else {
      toast.info('Già presente nella lista')
    }
  }

  async function removeItem(item) {
    const { error: err } = await supabase.from('user_list_items').delete().eq('id', item.id)
    if (err) { toast.error(`Rimuovi: ${err.message}`); return }
    setItems((cur) => cur.filter((i) => i.id !== item.id))
  }

  const inList = new Set((items ?? []).map((i) => i.tmdb_id))
  const libFiltered = (library ?? []).filter((s) =>
    !inList.has(s.tmdb_id) && s.title.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      <h1 className="page-title">LISTE</h1>

      {error && (
        <div className="banner banner-error mt-16">
          <span className="banner-tag">ERR</span>
          <span className="banner-msg mono">{error}</span>
        </div>
      )}

      <div className="list-tabs mt-16">
        {(lists ?? []).map((l) => (
          <button key={l.id} type="button"
            className={`tab${activeId === l.id ? ' active' : ''}`}
            onClick={() => setActiveId(l.id)}>
            {l.name}
          </button>
        ))}
        <button type="button" className={`tab${creating ? ' active' : ''}`}
          onClick={() => setCreating((c) => !c)}>
          + Nuova
        </button>
      </div>

      {creating && (
        <form className="card card-accent mt-16" onSubmit={createList}>
          <div className="field">
            <label className="label" htmlFor="list-name">Nome</label>
            <input id="list-name" className="input" value={name} maxLength={60}
              onChange={(e) => setName(e.target.value)} placeholder="es. Da rivedere" />
          </div>
          <div className="field">
            <label className="label" htmlFor="list-desc">Descrizione (facoltativa)</label>
            <input id="list-desc" className="input" value={desc} maxLength={200}
              onChange={(e) => setDesc(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={!name.trim()}>
            Crea lista
          </button>
        </form>
      )}

      {lists?.length === 0 && !creating && (
        <div className="empty-state mt-16">
          <span className="overline">// vuoto</span>
          Nessuna lista: creane una con "+ Nuova".
        </div>
      )}

      {activeList && (
        <>
          <SectionHead title={activeList.name.toUpperCase()} tag={items ? `${items.length} titoli` : '…'} />
          {activeList.description && (
            <p className="text-sm text-sub" style={{ marginTop: -6, marginBottom: 12 }}>
              {activeList.description}
            </p>
          )}

          <div className="detail-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-sm" onClick={openAdd}>Aggiungi serie</button>
            {items?.length > 0 && (
              <button type="button" className={`btn btn-sm${editMode ? ' btn-primary' : ' btn-ghost'}`}
                onClick={() => setEditMode((m) => !m)}>
                {editMode ? 'Fine' : 'Modifica'}
              </button>
            )}
            <ConfirmButton
              label="Elimina lista"
              confirmLabel="Conferma eliminazione"
              className="btn btn-sm btn-ghost"
              armedClassName="btn btn-sm btn-danger"
              onConfirm={deleteList}
            />
          </div>

          {items?.length === 0 && (
            <div className="empty-state mt-16">
              <span className="overline">// vuota</span>
              Aggiungi titoli dalla tua libreria.
            </div>
          )}

          {items?.length > 0 && (
            <div className="poster-grid mt-16">
              {items.map((it) => (
                <div key={it.id} className="show-card" style={{ position: 'relative' }}>
                  {editMode && (
                    <button type="button" className="item-x" aria-label={`Rimuovi ${it.title}`}
                      onClick={() => removeItem(it)}>×</button>
                  )}
                  <Link to={`/serie/${it.tmdb_id}`}>
                    <div className="poster-box">
                      {it.poster_path
                        ? <img className="poster" src={IMG(it.poster_path)} alt="" loading="lazy" />
                        : <div className="poster poster-empty">{it.title.charAt(0)}</div>}
                    </div>
                    <div className="show-card-body">
                      <div className="show-card-title">{it.title}</div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={`Aggiungi a "${activeList?.name ?? ''}"`}>
        <input className="input" type="search" placeholder="Filtra la libreria…"
          value={filter} onChange={(e) => setFilter(e.target.value)} />
        {!library && <p className="overline mt-16">// caricamento…</p>}
        {library && libFiltered.length === 0 && (
          <div className="empty-state mt-16">
            <span className="overline">// niente</span>
            Nessuna serie da aggiungere.
          </div>
        )}
        <div className="stack-8 mt-16">
          {libFiltered.slice(0, 60).map((s) => (
            <button key={s.tmdb_id} type="button" className="result-row" onClick={() => addItem(s)}>
              {s.poster_path
                ? <img className="result-poster" src={IMG(s.poster_path, 'w154')} alt="" loading="lazy" />
                : <div className="result-poster poster-empty">{s.title.charAt(0)}</div>}
              <div style={{ minWidth: 0 }}>
                <div className="result-title">{s.title}</div>
                <div className="overline">{s.first_air_year ?? ''}</div>
              </div>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}
