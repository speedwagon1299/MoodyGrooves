import type { Playlist } from '../types/spotify'

type Props = {
  playlist: Playlist
  checked: boolean
  onToggle: (id: string) => void
}

export default function PlaylistCard({ playlist, checked, onToggle }: Props) {
  const img = playlist.images?.[0]?.url || '/placeholder.png'
  return (
    <div className="card playlist-card h-100">
      <img src={img} className="card-img-top" alt={playlist.name} />
      <div className="card-body d-flex flex-column">
        <h6 className="card-title mb-1" title={playlist.name}>{playlist.name}</h6>
        <p className="mb-2 text-muted small">
          {playlist.tracks?.total ?? '—'} tracks
        </p>
        <div className="mt-auto d-flex justify-content-between align-items-center">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id={`chk-${playlist.id}`}
              checked={checked}
              onChange={() => onToggle(playlist.id)}
            />
            <label className="form-check-label" htmlFor={`chk-${playlist.id}`}>
              Include
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
