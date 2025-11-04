import { getLoginUrl } from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  const handleLogin = () => {
    // default demo userId — change if you want dynamic userId collection
    const demoUserId = 'speedwagon1299'
    window.location.href = getLoginUrl(demoUserId)
  }

  return (
    <div className="app-container">
      <div className="card shadow-sm">
        <div className="card-body text-center">
          <h2 className="card-title">MoodyGrooves — find songs by tone</h2>
          <p className="card-text">
            Sign in with Spotify to show your playlists and search songs by tone.
          </p>

          <div className="d-flex justify-content-center gap-2">
            <button className="btn btn-success" onClick={handleLogin}>
              Login with Spotify
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
