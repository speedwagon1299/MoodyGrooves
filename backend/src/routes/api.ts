// src/routes/api.ts
import express from "express";
import requireAuth from "../middleware/requireAuth";
import { fetchAllPlaylists } from "../services/spotify";

const router = express.Router();

router.get("/playlists", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { profile, playlists } = await fetchAllPlaylists(userId);
    return res.json({ profile, playlists });
  } catch (err: any) {
    console.error("failed fetchAllPlaylists:", err);
    // If the spotify refresh failed and you removed refresh token in getValidAccessToken,
    // propagate an actionable error to client so they can reauth:
    if (String(err.message).includes("no_refresh_token_stored_for_user") || String(err.message).includes("refresh_failed")) {
      return res.status(401).json({ error: "reauth_required" });
    }
    return res.status(500).json({ error: "server_error", details: String(err.message || err) });
  }
});

export default router;
