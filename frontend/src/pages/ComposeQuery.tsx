// src/pages/ComposeQuery.tsx
import { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getTracks } from '../services/api'
import type { TrackInfo, LocationState } from '../types/spotify'

// convert milliseconds to hh:mm:ss format
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function ComposeQuery() {
  const nav = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const hrefs = state?.hrefs || [];

  const [phrase, setPhrase] = useState('');
  const [songTracks, setSongTracks] = useState<TrackInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(songTracks.length / PAGE_SIZE));
  const paginatedTracks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return songTracks.slice(start, start + PAGE_SIZE);
  }, [songTracks, page]);
  const prev = () => setPage((p) => Math.max(1, p - 1));
  const next = () => setPage((p) => Math.min(totalPages, p + 1));
  const goToFirst = () => setPage(1);
  const goToLast = () => setPage(totalPages);

  const handleSubmit = async () => {
    if (!phrase.trim()) {
      alert('Please enter a phrase or word to continue.')
      return
    }
    try {
      setLoading(true)
      const tracks = await getTracks(phrase, hrefs)
      setSongTracks(tracks)
    } catch (err) {
      console.error('Error calling getTracks:', err)
      alert('Error fetching tracks. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  if (!hrefs.length) {
    return (
      <div className="app-container">
        <div className="alert alert-warning">
          No playlists selected. Please go back and select at least one playlist.
        </div>
        <div className="d-flex">
          <button className="btn btn-outline-secondary me-2" onClick={() => nav('/search')}>
            Back to playlists
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <h4>Enter the phrase or word to use</h4>
      <p className="text-muted">Selected playlists: {hrefs.length}</p>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Write a word or short phrase that will be used to find similar-tone songs..."
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
        />
      </div>

      <div className="d-flex gap-2 mb-4">
        <button className="btn btn-secondary" onClick={() => nav('/search')}>
          Back
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Loading...' : 'Use phrase'}
        </button>
      </div>

      <button
        className="btn btn-success mb-3"
        onClick={() => nav("/create-playlist", { state: { trackIds: songTracks.map(t => t.id) } })}
      >
        Make Playlist
      </button>

      {songTracks.length > 0 && (
        <>
          <div className="mb-2 d-flex justify-content-between align-items-center">
            <div>
              <button className="btn btn-outline-secondary me-2" onClick={prev} disabled={page === 1}>Prev</button>
              <button className="btn btn-outline-secondary me-2" onClick={next} disabled={page === totalPages}>Next</button>
              <span className="ms-2">Page {page} / {totalPages}</span>
            </div>

            <div>
              <button className="btn btn-sm btn-outline-secondary me-1" onClick={goToFirst} disabled={page === 1}>First</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={goToLast} disabled={page === totalPages}>Last</button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-striped align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '5%' }}>#</th>
                  <th style={{ width: '40%' }}>Title</th>
                  <th style={{ width: '25%' }}>Artists</th>
                  <th style={{ width: '20%' }}>Album</th>
                  <th style={{ width: '10%' }} className="text-end">Duration</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTracks.map((track, i) => (
                  <tr key={track.id}>
                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>{track.name}</td>
                    <td>{track.artists.join(', ')}</td>
                    <td>{track.album}</td>
                    <td className="text-end">{formatDuration(track.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}