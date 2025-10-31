import fetch from "node-fetch"; // if node version <18; otherwise use global fetch
import { redis } from "../lib/redis";
import { createSession } from "../lib/session";
import { encrypt } from "../utils/crypto";
import { StoredRefresh, TokenResponse } from "@/types";
import { Request, Response } from "express";
import { REDIS_REFRESH_KEY, REDIS_ACCESS_KEY } from "../services/spotify";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "moody_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Exchange authorization code for tokens, store refresh token (encrypted) in Redis.
 * TODO: Store refresh_token in persistent DB as well, not just redis.
 * - https://developer.spotify.com/documentation/web-api/tutorials/code-flow
 * - https://developer.spotify.com/documentation/web-api/concepts/access-token
 * - https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
 */
export async function handleCallback(req: Request, res: Response) {
  // authorization code to be exchanged for an access token
  const code = String(req.query.code || "");
  // value of state param passed in /auth/spotify
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

  // Check for refresh token and store
  if (!data.refresh_token) {
    console.warn("No refresh token returned:", data);
  } else {
    const stored: StoredRefresh = {
      encryptedRefreshToken: encrypt(String(data.refresh_token)),
      scopes: data.scope ? String(data.scope).split(" ") : []
    };
    // Persist refresh token (encrypted) into Redis
    await redis.set(REDIS_REFRESH_KEY(userId), JSON.stringify(stored));
  }

  // Check for access token and store with TTL
  if (data.access_token && data.expires_in) {
    const expiresAt = Date.now() + data.expires_in * 1000;
    const value = JSON.stringify({ token: data.access_token, expiresAt });
    // -30 msfor safety margin
    await redis.set(REDIS_ACCESS_KEY(userId), value, { PX: (data.expires_in - 30) * 1000 });
  }

  // Create a server-side session and set httpOnly cookie.
  const sessionPayload = {
    userId,
    createdAt: Date.now(),
  };
  const sessionId = await createSession(sessionPayload, SESSION_TTL_SECONDS);

  // set cookie (httpOnly so JS cannot read it)
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // set true in prod with HTTPS
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/"
  });

  // TODO: Redirect to frontend app URL
  res.send("Spotify linked! You can close this tab. (For demo, userId = " + userId + ")");
}