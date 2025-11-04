// src/pages/CreatePlaylist.tsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPlaylist } from "../services/api";

type LocationState = { trackIds?: string[] } | null;

export default function CreatePlaylist() {
  const nav = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) ?? null;
  const initialTrackIds = state?.trackIds ?? [];

  const [trackIds] = useState<string[]>(initialTrackIds);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If no tracks were passed, redirect back to compose/search
    if (!trackIds || trackIds.length === 0) {
      nav("/search"); 
    }
  }, [trackIds, nav]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!name.trim()) {
      alert("Please provide a playlist name");
      return;
    }
    if (!trackIds.length) {
      alert("No tracks selected");
      return;
    }

    setSaving(true);
    try {
      const res = await createPlaylist({ name, public: isPublic, trackIds });
      
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Status ${res.status}`);
      }

      alert("Playlist created successfully!");

      nav("/compose");
    } catch (err: any) {
      console.error("create playlist failed", err);
      alert("Failed to create playlist: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-container">
      <div className="card shadow-sm">
        <div className="card-body">
          <h4 className="card-title">Create Playlist</h4>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Playlist name</label>
              <input
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My mellow playlist"
                disabled={saving}
                autoFocus
              />
            </div>

            <div className="form-check mb-3">
              <input
                id="isPublic"
                className="form-check-input"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={saving}
              />
              <label htmlFor="isPublic" className="form-check-label">
                Make playlist public
              </label>
            </div>

            <div className="mb-3">
              <strong>{trackIds.length}</strong> tracks will be added.
            </div>

            <div className="d-flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => nav(-1)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Creating..." : "Create Playlist"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
