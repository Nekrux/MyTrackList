import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { posterUrl } from '../lib/tmdb'
import Spinner from '../components/Spinner'

export default function ListDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [allLists, setAllLists] = useState([])
  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryShows, setLibraryShows] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: listsData }, { data: listData }, { data: itemsData }, { data: showsData }] = await Promise.all([
      supabase.from('user_lists').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_lists').select('*').eq('id', id).single(),
      supabase.from('user_list_items').select('*').eq('list_id', id).order('added_at', { ascending: false }),
      supabase.from('user_shows').select('tmdb_id, title, poster_path').eq('user_id', user.id)
    ])
    setAllLists(listsData || [])
    setList(listData)
    setItems(itemsData || [])
    setLibraryShows(showsData || [])
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user, id])

  async function addItem(show) {
    if (items.some(i => i.tmdb_id === show.tmdb_id)) return
    const { data } = await supabase.from('user_list_items').insert({
      list_id: id, user_id: user.id, tmdb_id: show.tmdb_id, title: show.title, poster_path: show.poster_path
    }).select().single()
    setItems(prev => [data, ...prev])
  }

  async function removeItem(itemId) {
    await supabase.from('user_list_items').delete().eq('id', itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  async function deleteList() {
    if (!confirmingDelete) { setConfirmingDelete(true); return }
    const { error } = await supabase.from('user_lists').delete().eq('id', id)
    if (error) { showToast('Errore nell\'eliminazione della lista.', 'error'); return }
    navigate('/liste')
  }

  const filteredLibrary = libraryShows.filter(s =>
    librarySearch.trim() && s.title.toLowerCase().includes(librarySearch.toLowerCase())
  ).slice(0, 8)

  if (loading) return <Spinner label="Caricamento lista..." />
  if (!list) return <div className="page"><div className="empty-state"><h3>Lista non trovata</h3></div></div>

  return (
    <div className="page">
      <div className="chip-row" style={{ marginBottom: 16 }}>
        {allLists.map(l => (
          <Link key={l.id} to={`/liste/${l.id}`} className={`chip ${l.id === id ? 'active' : ''}`}>{l.name}</Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 26 }}>{list.name}</h1>
          {list.description && <p style={{ fontSize: 13, color: 'var(--subtext)', marginTop: 4 }}>{list.description}</p>}
        </div>
        <button className="btn danger" onClick={deleteList}>
          {confirmingDelete ? 'Conferma eliminazione' : 'Elimina'}
        </button>
      </div>
      {confirmingDelete && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn secondary" onClick={() => setConfirmingDelete(false)} style={{ fontSize: 12 }}>Annulla</button>
        </div>
      )}

      <div className="field" style={{ marginTop: 20 }}>
        <label>Aggiungi dalla tua libreria</label>
        <input
          placeholder="Cerca per titolo..."
          value={librarySearch}
          onChange={(e) => setLibrarySearch(e.target.value)}
        />
      </div>
      {filteredLibrary.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {filteredLibrary.map(s => (
            <button key={s.tmdb_id} onClick={() => addItem(s)} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, textAlign: 'left' }}>
              <div style={{ width: 36, aspectRatio: '2/3', background: 'var(--surface-hover)', overflow: 'hidden', flexShrink: 0 }}>
                {s.poster_path && <img src={posterUrl(s.poster_path, 'w92')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <span style={{ fontSize: 13, flex: 1 }}>{s.title}</span>
              <span style={{ color: 'var(--mauve)', fontSize: 18 }}>+</span>
            </button>
          ))}
        </div>
      )}

      <h2 className="section-title">{items.length} serie</h2>
      {items.length === 0 ? (
        <div className="empty-state">
          <h3>Lista vuota</h3>
          <p>Cerca una serie qui sopra tra quelle già nella tua libreria per aggiungerla.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} className="card" style={{ position: 'relative' }}>
              <Link to={`/serie/${item.tmdb_id}`}>
                <div style={{ aspectRatio: '2/3', background: 'var(--surface-hover)', overflow: 'hidden' }}>
                  {item.poster_path && <img src={posterUrl(item.poster_path)} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />}
                </div>
              </Link>
              <button
                onClick={() => removeItem(item.id)}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(30,30,46,0.8)', color: 'var(--red)', width: 26, height: 26, fontSize: 14 }}
                aria-label="Rimuovi dalla lista"
              >
                ✕
              </button>
              <div style={{ padding: 8, fontSize: 12, fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {item.title}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
