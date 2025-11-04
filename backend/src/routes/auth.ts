// src/routes/auth.ts
import express, { Request, Response } from "express";
import { handleCallback, spotifyAuthUrl, routeLogout } from "../services/auth";
import { getSession } from "../lib/session";

const router = express.Router();
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "moody_session";

// Start OAuth: /auth/spotify?userId=...
router.get("/spotify", (req: Request, res: Response) => {
  const userId = String(req.query.userId || "demo-user");
  const state = userId;
  res.redirect(spotifyAuthUrl(state));
});

// OAuth callback: /auth/spotify/callback
router.get("/spotify/callback", async (req: Request, res: Response) => {
  try {
    await handleCallback(req, res);
  } catch (err: any) {
    console.error("callback error", err);
    res.status(500).send(String(err.message || err));
  }
});

/**
 * Session check endpoint
 * GET /auth/session
 * -> 200 { authenticated: true, userId }  OR  401 { authenticated: false }
 *
 * Note: frontend calls GET /auth/session to decide whether to redirect to /search
 */
router.get("/session", async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.[COOKIE_NAME];
    if (!sessionId) return res.status(401).json({ authenticated: false });

    const session = await getSession(sessionId);
    if (!session) return res.status(401).json({ authenticated: false });

    return res.status(200).json({ authenticated: true, userId: session.userId });
  } catch (err) {
    console.error("session route error", err);
    return res.status(500).json({ authenticated: false });
  }
});

// wire both GET and POST to the same handler (frontend uses POST)
router.get("/logout", routeLogout);
router.post("/logout", routeLogout);

export default router;
