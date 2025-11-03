// src/services/auth.ts
import { redis } from "../lib/redis";
import { createSession, getSession, delSession } from "../lib/session";
import { encrypt } from "../utils/crypto";
import { StoredRefresh, TokenResponse } from "@/types";
import { Request, Response } from "express";
import { REDIS_REFRESH_KEY, REDIS_ACCESS_KEY } from "./api";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "moody_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * OAuth callback handler: exchange code -> tokens, store tokens, create session cookie,
 * then redirect browser to FRONTEND_URL/search.
 */
export async function handleCallback(req: Request, res: Response) {
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  if (!code) return res.status(400).send("Missing code");

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI!
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return res.status(500).send("Token exchange failed: " + text);
  }

  const data = await tokenRes.json() as TokenResponse; // access_token, refresh_token, expires_in, scope

  const userId = state || "demo-user";

  // Persist refresh token (encrypted) into Redis if available
  if (!data.refresh_token) {
    console.warn("No refresh token returned:", data);
  } else {
    const stored: StoredRefresh = {
      encryptedRefreshToken: encrypt(String(data.refresh_token)),
      scopes: data.scope ? String(data.scope).split(" ") : []
    };
    await redis.set(REDIS_REFRESH_KEY(userId), JSON.stringify(stored));
  }

  // Store access token with TTL in Redis (short-lived)
  if (data.access_token && data.expires_in) {
    const expiresAt = Date.now() + data.expires_in * 1000;
    const value = JSON.stringify({ token: data.access_token, expiresAt });
    await redis.set(REDIS_ACCESS_KEY(userId), value, { PX: (data.expires_in - 30) * 1000 });
  }

  // Create server-side session and set httpOnly cookie
  const sessionPayload = {
    userId,
    createdAt: Date.now(),
  };
  const sessionId = await createSession(sessionPayload, SESSION_TTL_SECONDS);

  // set cookie (httpOnly so JS cannot read it)
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/"
  });

  // Redirect to frontend app URL (search page)
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
  const redirectTo = new URL("/search", FRONTEND_URL).toString();
  return res.redirect(302, redirectTo);
}

/**
 * GET /auth/session
 * Check whether the current request has a valid session cookie.
 * Returns 200 { authenticated: true, userId } or 401 { authenticated: false }.
 */
export async function getSessionHandler(req: Request, res: Response) {
  try {
    const sessionId = req.cookies?.[COOKIE_NAME];
    if (!sessionId) return res.status(401).json({ authenticated: false });

    const session = await getSession(sessionId);
    if (!session) return res.status(401).json({ authenticated: false });

    return res.json({ authenticated: true, userId: session.userId });
  } catch (err) {
    console.error("session check error", err);
    return res.status(500).json({ authenticated: false });
  }
}

/**
 * POST /auth/logout
 * Destroy server session and clear cookie.
 */
export async function logoutHandler(req: Request, res: Response) {
  try {
    const sessionId = req.cookies?.[COOKIE_NAME];
    if (sessionId) {
      await delSession(sessionId);
    }
    // clear cookie
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("logout error", err);
    return res.status(500).json({ ok: false });
  }
}
