// src/routes/auth.ts
import express, { Request, Response } from "express";
import { handleCallback, spotifyAuthUrl, routeLogout } from "../services/auth";
import { getSession } from "../lib/session";
import { redis } from "../lib/redis";
import { v4 as uuidv4 } from "uuid";
import requireAuth from "../middleware/requireAuth";

const router = express.Router();
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "moody_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Start OAuth: /auth/spotify
router.get("/spotify", async (req: Request, res: Response) => {
  const state = uuidv4();
  await redis.set(`oauth_state:${state}`, "1", { EX: 300 }); // 5 minutes TTL
  res.redirect(spotifyAuthUrl(state));
});

// OAuth callback: /auth/spotify/callback
router.get("/spotify/callback", async (req, res) => {
  try {
    const sessionId = await handleCallback(req);
    res.redirect(
      `http://localhost:4000/auth/finalize?sid=${sessionId}`
    );
  } catch (err: any) {
    console.error("callback error", err);
    res.status(500).send(String(err.message || err));
  }
});

/** Get current user information */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  res.json({ ok: true, userId });
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

router.get("/finalize", (req, res) => {
  const sid = req.query.sid;

  if (!sid || typeof sid !== "string") {
    return res.status(400).send("Missing session");
  }

  res.cookie(COOKIE_NAME, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/"
  });

  res.redirect("http://localhost:4173");
});


// wire both GET and POST to the same handler (frontend uses POST)
router.get("/logout", routeLogout);
router.post("/logout", routeLogout);

export default router;
