import type { Playlist, TrackInfo } from '../types/spotify'

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export async function getPlaylists(): Promise<Playlist[]> {
  const res = await fetch(`${BASE}/api/playlists`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  })
  if (res.status === 401) {
    throw new Error('unauthorized')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch playlists: ${res.status} ${text}`)
  }
  const data = await res.json()
  // backend returns JSON — if it's wrapped adjust below
  if (Array.isArray(data)) return data
  if (data.items) return data.items
  return data.playlists || []
}

export async function getTracks(phrase: string, hrefs: string[]): Promise<TrackInfo[]> {
  if (!Array.isArray(hrefs) || hrefs.length === 0) {
    throw new Error("hrefs_required")
  }

  if (!phrase.trim()) {
    throw new Error("phrase_required")
  }

  const res = await fetch(`${BASE}/api/tracks`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ hrefs, phrase }),
  })

  if (res.status === 401) throw new Error("unauthorized")

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Failed to fetch tracks: ${res.status} ${text}`)
  }

  const data = await res.json()

  if (!Array.isArray(data.tracks)) {
    throw new Error("Invalid response: expected { tracks: TrackInfo[] }")
  }

  console.log("Backend returned", data.tracks.length, "tracks")
  return data.tracks
}

/** Return auth URL for Spotify authorization on your backend. */
export function getLoginUrl() {
  const base = `${BASE}/auth/spotify`
  if (!userId) return base
  // append as query param
  const url = new URL(base)
  url.searchParams.set('userId', userId)
  return url.toString()
}

/** Logout endpoint. Returns the fetch promise. */
export function logout() {
  return fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  })
}