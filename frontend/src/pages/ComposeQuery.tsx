// src/pages/ComposeQuery.tsx
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getTracks } from '../services/api'

type LocationState = {
  hrefs?: string[]
}

export default function ComposeQuery() {
  const nav = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const hrefs = state?.hrefs || []

  const [phrase, setPhrase] = useState('')

  const handleSubmit = async () => {
    // Basic validation
    if (!phrase.trim()) {
      alert('Please enter a phrase or word to continue.')
      return
    }
    try {
      await getTracks(hrefs)
      alert("Songs fetched and logged in backend console!")
    } catch (err) {
      console.error("Error calling getTracks:", err)
    }
    // TODO: backend call with phrase and playlist hrefs
    console.log('Phrase submitted:', { phrase, hrefs })
  }

  if (!hrefs.length) {
    return (
      <div className="app-container">
        <div className="alert alert-warning">
          No playlists selected. Please go back and select at least one playlist.
        </div>
        <div className="d-flex">
          <button className="btn btn-outline-secondary me-2" onClick={() => nav('/search')}>Back to playlists</button>
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

      <div className="d-flex gap-2">
        <button className="btn btn-secondary" onClick={() => nav('/search')}>Back</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Use phrase</button>
      </div>
    </div>
  )
}
