import { useEffect, useState } from 'react'
import type { Playlist } from '../types/spotify'
import { getPlaylists, logout } from '../services/api'
import PlaylistCard from '../components/PlaylistCard'
import SearchBar from '../components/SearchBar'
import { useNavigate } from 'react-router-dom'

const PAGE_SIZE = 8

export default function SearchPlaylists() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const navigate = useNavigate()

  // Fetch playlists on load
  useEffect(() => {
    let mounted = true
    setLoading(true)
    getPlaylists()
      .then((items) => {
        if (!mounted) return
        setPlaylists(items)
        setSelected(new Set()) // start with nothing selected
        setCurrentPage(1)
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

  // Filter playlists by search query
  const filtered = playlists.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE)

  // Selection helpers
  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(playlists.map((p) => p.id)))
  }

  const deselectAll = () => {
    setSelected(new Set())
  }

  const goToPage = (n: number) => {
    const page = Math.min(Math.max(1, n), totalPages)
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Continue -> extract hrefs and navigate
  const handleContinue = () => {
    const selectedIds = Array.from(selected)
    if (selectedIds.length === 0) return

    // get only playlists that exist and have tracks.href
    const selectedPlaylists = selectedIds
      .map((id) => playlists.find((p) => p.id === id))
      .filter((p): p is Playlist => Boolean(p && p.tracks?.href))

    const hrefs = selectedPlaylists.map((p) => p.tracks!.href!)

    // navigate with only the hrefs needed for ComposeQuery
    navigate('/compose', { state: { hrefs } })
  }

  const selectedCount = selected.size

  return (
    <div className="app-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Choose playlists to include</h4>
        <div>
          <button
            className="btn btn-outline-secondary me-2"
            onClick={() => navigate('/')}
          >
            Home
          </button>
          <button
            className="btn btn-outline-danger"
            onClick={() => {
              logout().finally(() => navigate('/'))
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <SearchBar
        query={query}
        onChange={(q) => {
          setQuery(q)
          setCurrentPage(1)
        }}
        onSubmit={() => {}}
      />

      <div className="mb-3 d-flex align-items-center justify-content-between">
        <div>
          <strong>{selectedCount}</strong> selected
          <span className="text-muted ms-2"> / {playlists.length} playlists</span>
        </div>
        <div className="btn-group">
          <button className="btn btn-sm btn-outline-primary" onClick={selectAll}>
            Select all
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={deselectAll}
          >
            Deselect all
          </button>
        </div>
      </div>

      {loading && <div className="alert alert-info">Loading playlists...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="playlist-grid">
        {pageItems.length === 0 && !loading && (
          <div className="text-muted">No playlists match your search.</div>
        )}
        {pageItems.map((p) => (
          <PlaylistCard
            key={p.id}
            playlist={p}
            checked={selected.has(p.id)}
            onToggle={toggle}
          />
        ))}
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div>
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Prev
          </button>
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next → 
          </button>
          <span className="ms-3 text-muted">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {totalPages <= 10 ? (
          <div>
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  className={`btn btn-sm ${
                    p === currentPage ? 'btn-primary' : 'btn-outline-primary'
                  } me-1`}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="input-group input-group-sm" style={{ width: 120 }}>
            <input
              type="number"
              className="form-control"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => goToPage(Number(e.target.value || 1))}
            />
            <span className="input-group-text">/ {totalPages}</span>
          </div>
        )}
      </div>

      <div className="mt-4 d-flex justify-content-end">
        <button
          className={selectedCount > 0 ? 'btn btn-success' : 'btn btn-secondary'}
          onClick={handleContinue}
          disabled={selectedCount === 0}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
