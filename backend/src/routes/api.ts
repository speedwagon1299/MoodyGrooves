// src/routes/api.ts
import express from "express";
import { fetchAllPlaylists } from "../services/spotify";

const router = express.Router();

router.get("/playlists", async (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) return res.status(400).json({ error: "missing userId" });

  try {
    const data = await fetchAllPlaylists(userId);
    return res.json(data);
  } catch (err: any) {
    console.error("playlists error", err);
    return res.status(400).json({ error: String(err.message || err) });
  }
});

export default router;
