import { useEffect, useState } from "react";
import { getLoginUrl, getCurrentUser } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const user = await getCurrentUser();
        if (user?.ok) {
          // already logged in -> redirect to search page
          navigate("/search");
          return;
        }
      } catch {
        // not logged in or 401 — show login
      } finally {
        setChecking(false);
      }
    }
    checkSession();
  }, [navigate]);

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  if (checking) {
    return <div className="text-center mt-5">Checking session...</div>;
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
  );
}
