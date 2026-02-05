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

export function spotifyAuthUrl(state: string) {
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

/**
 * OAuth callback handler: exchange code -> tokens, store tokens, create session cookie,
 * then redirect browser to FRONTEND_URL/search.
 */
export async function handleCallback(req: Request): Promise<string> {
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  if (!code) throw new Error("Missing code");
  if (!state) throw new Error("Missing state");

  const stateKey = `oauth_state:${state}`;
  const stateExists = await redis.get(stateKey);
  if (!stateExists) throw new Error("Invalid or expired state");
  await redis.del(stateKey);

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI!
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  if (!tokenRes.ok) {
    throw new Error("Token exchange failed: " + (await tokenRes.text()));
  }

  const data = (await tokenRes.json()) as TokenResponse;

  if (!data.access_token) {
    throw new Error("Missing access token from Spotify");
  }

  const profileRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${data.access_token}` }
  });

  if (!profileRes.ok) {
    throw new Error("Failed to fetch Spotify profile");
  }

  const profile = await profileRes.json();
  const spotifyUserId = String(profile.id);

  if (data.refresh_token) {
    await redis.set(
      REDIS_REFRESH_KEY(spotifyUserId),
      JSON.stringify({
        encryptedRefreshToken: encrypt(String(data.refresh_token)),
        scopes: data.scope ? String(data.scope).split(" ") : []
      })
    );
  }

  if (data.access_token && data.expires_in) {
    await redis.set(
      REDIS_ACCESS_KEY(spotifyUserId),
      JSON.stringify({
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000
      }),
      { PX: (data.expires_in - 30) * 1000 }
    );
  }

  const sessionPayload = { userId: spotifyUserId, createdAt: Date.now() };
  const sessionId = await createSession(sessionPayload, SESSION_TTL_SECONDS);

  return sessionId;
}


/**
 * Unified logout handler function (reused for GET & POST)
 *
 * POST /auth/logout   (preferred; matches frontend)
 * GET  /auth/logout   (kept for convenience / browser testing)
 */
export async function routeLogout(req: Request, res: Response) {
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
