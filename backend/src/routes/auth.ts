// src/routes/auth.ts
import express, { Request, Response } from "express";
import { handleCallback } from "../services/auth";

const router = express.Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;

function spotifyAuthUrl(state: string) {
  const scopes = [
    "playlist-read-private",
    "playlist-modify-private",
    "playlist-modify-public",
  ].join(" ");

  const u = new URL("https://accounts.spotify.com/authorize");
  u.searchParams.set("client_id", SPOTIFY_CLIENT_ID);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", SPOTIFY_REDIRECT_URI);
  u.searchParams.set("state", state);
  u.searchParams.set("scope", scopes);
  return u.toString();
}

router.get("/spotify", (req: Request, res: Response) => {
  const userId = String(req.query.userId || "demo-user");
  const state = userId;
  res.redirect(spotifyAuthUrl(state));
});

router.get("/spotify/callback", async (req: Request, res: Response) => {
    try {
      await handleCallback(req, res);
    } catch (err: any) {
      console.error("callback error", err);
      res.status(500).send(String(err.message || err));
    }
  });

export default router;
