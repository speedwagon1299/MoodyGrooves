// src/routes/auth.ts
import express, { Request, Response } from "express";
import { handleCallback } from "../services/auth";
import { delSession, getSession } from "../lib/session";
import { REDIS_ACCESS_KEY, REDIS_REFRESH_KEY } from "../services/api";
import { redis } from "../lib/redis";

const router = express.Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "moody_session";

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
  u.searchParams.set("show_dialog", "true");
  return u.toString();
}

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

/**
 * Unified logout handler function (reused for GET & POST)
 *
 * POST /auth/logout   (preferred; matches frontend)
 * GET  /auth/logout   (kept for convenience / browser testing)
 */
async function routeLogout(req: Request, res: Response) {
  try {
    console.log("[logout] called");
    const sessionId = req.cookies?.[COOKIE_NAME];
    console.log("[logout] sessionId from cookie:", sessionId);

    if (sessionId) {
      const session = await getSession(sessionId);
      console.log("[logout] session from redis:", !!session);

      if (session && session.userId) {
        const userId = session.userId as string;
        await redis.del(REDIS_ACCESS_KEY(userId));
        await redis.del(REDIS_REFRESH_KEY(userId));
        console.log(`[logout] deleted redis tokens for ${userId}`);
      }

      await delSession(sessionId);
      console.log("[logout] deleted session key in redis");
    } else {
      console.log("[logout] no sessionId present on request");
    }

    // Use the exact same attributes you used when setting the cookie
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production"
      // do NOT set domain here if you didn't set domain when creating the cookie
    };

    // This should add a Set-Cookie header that clears the cookie
    res.clearCookie(COOKIE_NAME, cookieOptions);

    // Belt-and-suspenders: explicitly set an expiring Set-Cookie header
    const expires = new Date(0).toUTCString();
    const secureFlag = cookieOptions.secure ? "Secure; " : "";
    const sameSite = "SameSite=Lax; "; // matches cookieOptions.sameSite
    const httpOnly = "HttpOnly; ";
    const path = "Path=/; ";

    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=; Expires=${expires}; ${path}${httpOnly}${secureFlag}${sameSite}`
    );

    console.log("[logout] emitted Set-Cookie header to expire cookie");

    return res.status(200).json({ ok: true, message: "Fully logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ ok: false, error: "Server error during logout" });
  }
}

// wire both GET and POST to the same handler (frontend uses POST)
router.get("/logout", routeLogout);
router.post("/logout", routeLogout);

export default router;
