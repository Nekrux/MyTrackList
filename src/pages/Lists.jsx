import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'

export default function Lists() {
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!user) return
    setLoading(true)
    const { data: listsData } = await supabase.from('user_lists').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setLists(listsData || [])
    if (listsData?.length) {
      const { data: items } = await supabase.from('user_list_items').select('list_id').in('list_id', listsData.map(l => l.id))
      const c = {}
      ;(items || []).forEach(i => { c[i.list_id] = (c[i.list_id] || 0) + 1 })
      setCounts(c)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('user_lists').insert({ user_id: user.id, name: name.trim(), description: description.trim() || null })
    setName('')
    setDescription('')
    setShowForm(false)
    setSaving(false)
    load()
  }

  if (loading) return <Spinner label="Caricamento liste..." />

  return (
    <div className="page">
      <div className="eyebrow">MyTrackList</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 30 }}>Liste</h1>
        <button className="btn" onClick={() => setShowForm(f => !f)}>{showForm ? 'Annulla' : '+ Nuova lista'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="field">
            <label>Nome lista</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Es. Da vedere con Marco" />
          </div>
          <div className="field">
            <label>Descrizione (opzionale)</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button className="btn block" type="submit" disabled={saving}>{saving ? 'Creazione...' : 'Crea lista'}</button>
        </form>
      )}

      {lists.length === 0 ? (
        <div className="empty-state">
          <h3>Nessuna lista</h3>
          <p>Crea la tua prima lista personalizzata per organizzare le serie come preferisci.</p>
        </div>
      ) : (
        <div className="chip-row" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
          {lists.map(list => (
            <Link key={list.id} to={`/liste/${list.id}`} className="card" style={{ padding: 14, minWidth: 160, flex: '0 0 auto' }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{list.name}</div>
              {list.description && <div style={{ fontSize: 12, color: 'var(--subtext)', marginBottom: 6 }}>{list.description}</div>}
              <div style={{ fontSize: 11, color: 'var(--mauve)' }}>{counts[list.id] || 0} serie</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
