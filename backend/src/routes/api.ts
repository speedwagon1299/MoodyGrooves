// src/routes/api.ts
import express from "express";
import requireAuth from "../middleware/requireAuth";
import { fetchAllPlaylists, fetchAllSongsFromPlaylists, fetchTracksInfo } from "../services/api";
import { classifySongs } from "../services/gemini";

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

router.post("/tracks", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { hrefs, phrase } = req.body;

    if (!Array.isArray(hrefs) || hrefs.length === 0) {
      return res
        .status(400)
        .json({ error: "hrefs_required", message: "Provide an array of playlist hrefs." });
    }

    console.log(`Received ${hrefs.length} playlist hrefs.`);
    console.log(hrefs);
    
    // fetch all the songs from the provided playlists along with their hrefs
    const { uniqueSongs, uniqueHrefIds } = await fetchAllSongsFromPlaylists(userId, hrefs);

    // classify songs using Gemini
    const matches = await classifySongs(phrase, uniqueSongs);

    // filter hrefs based on matches
    const filteredHrefIds = uniqueHrefIds.filter((_, i) => matches[i]);

    const filteredSongs = await fetchTracksInfo(userId, filteredHrefIds);

    return res.json({ tracks: filteredSongs });

  } catch (err: any) {
    console.error("failed fetchAllSongsFromPlaylists:", err);
    if (
      String(err.message).includes("no_refresh_token_stored_for_user") ||
      String(err.message).includes("refresh_failed")
    ) {
      return res.status(401).json({ error: "reauth_required" });
    }
    return res
      .status(500)
      .json({ error: "server_error", details: String(err.message || err) });
  }
});

export default router;
