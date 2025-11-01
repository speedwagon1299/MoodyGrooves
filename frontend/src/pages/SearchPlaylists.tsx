import { useEffect, useState } from 'react'
import type { Playlist } from '../types/spotify'
import { getPlaylists, logout } from '../services/api'
import PlaylistCard from '../components/PlaylistCard'
import SearchBar from '../components/SearchBar'
import { useNavigate } from 'react-router-dom'

export default function SearchPlaylists() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getPlaylists()
      .then((items) => {
        if (!mounted) return
        setPlaylists(items)
        const initial: Record<string, boolean> = {}
        items.forEach((p) => (initial[p.id] = true)) // default: include all
        setSelected(initial)
      })
      .catch((err) => {
        if (!mounted) return
        if (err.message === 'unauthorized') {
          navigate('/')
          return
        }
        setError(err.message)
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [navigate])

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const selectedIds = Object.entries(selected).filter(([_, v]) => v).map(([k]) => k)

  const filteredPlaylists = playlists.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleSearchSubmit = () => {
    console.log('Search:', { query, selectedIds })
    alert(`Searching for "${query}" in ${selectedIds.length} playlist(s). Check console for details.`)
  }

  return (
    <div className="app-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Search your playlists</h4>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => window.location.href = '/'}>
            Home
          </button>
          <button className="btn btn-outline-danger" onClick={() => {
            logout().finally(() => window.location.href = '/')
          }}>Logout</button>
        </div>
      </div>

      <SearchBar
        query={query}
        onChange={setQuery}
        onSubmit={handleSearchSubmit}
      />

      <div className="mb-3 d-flex align-items-center justify-content-between">
        <div>
          <strong>{selectedIds.length}</strong> selected
          <span className="text-muted ms-2"> / {playlists.length} playlists</span>
        </div>
        <div className="btn-group">
          <button className="btn btn-sm btn-outline-primary" onClick={() => {
            const all: Record<string, boolean> = {}
            playlists.forEach((p) => all[p.id] = true)
            setSelected(all)
          }}>Select all</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => {
            const none: Record<string, boolean> = {}
            playlists.forEach((p) => none[p.id] = false)
            setSelected(none)
          }}>Deselect all</button>
        </div>
      </div>

      {loading && <div className="alert alert-info">Loading playlists...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="playlist-grid">
        {filteredPlaylists.map((p) => (
          <PlaylistCard
            key={p.id}
            playlist={p}
            checked={!!selected[p.id]}
            onToggle={toggle}
          />
        ))}
      </div>

      <div className="mt-4 d-flex justify-content-end">
        <button className="btn btn-success" onClick={handleSearchSubmit} disabled={selectedIds.length === 0 || !query}>
          Search selected playlists
        </button>
      </div>
    </div>
  )
}
