import fetch from "node-fetch"; // if node version <18; otherwise use global fetch
import { redis } from "../lib/redis";
import { encrypt, decrypt } from "../utils/crypto";
import { StoredRefresh, TokenResponse, CurrentUserPlaylists } from "@/types";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

/** Value: Encrypted Refresh Key and Scopes */
export const REDIS_REFRESH_KEY = (userId: string) => `spotify:refresh:${userId}`;

/** Value: Encrypted Access Key and TTL */
export const REDIS_ACCESS_KEY = (userId: string) => `spotify:access:${userId}`;

/* -------------------- Token management -------------------- */

/**
 * getValidAccessToken(userId):
 *  - check Redis cache for access token and expiry
 *  - if missing/expired => read stored encrypted refresh token, call Spotify token endpoint to refresh
 *  - cache the new access token in Redis and update stored refresh token if Spotify rotated it
 *
 * Throws an error if no refresh token found or refresh fails (caller should trigger reauth).
 * 
 * - https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
 */
async function getValidAccessToken(userId: string): Promise<string> {
  
  // try cached access token in Redis, if found return else continue to refresh
  const cached = await redis.get(REDIS_ACCESS_KEY(userId));
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { token: string; expiresAt: number };
      // add small buffer to avoid expiration mid-request
      if (Date.now() < parsed.expiresAt - 60_000) return parsed.token;
    } catch {
      // ignore parse errors and fall through to refresh logic
    }
  }

  // read stored (encrypted) refresh token
  const storedRaw = await redis.get(REDIS_REFRESH_KEY(userId));
  // TODO: if not found, caller function should trigger reauth 
  if (!storedRaw) throw new Error("no_refresh_token_stored_for_user");

  const stored: StoredRefresh = JSON.parse(storedRaw);
  const refreshToken = decrypt(stored.encryptedRefreshToken);

  // all Spotify refresh endpoint
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken
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
    const txt = await tokenRes.text();
    // If refresh failed, treat as disconnected -> remove stored refresh token
    console.error("Spotify refresh failed:", tokenRes.status, txt);
    // Delete invalid refresh key
    // TODO: Caller should trigger reauth 
    await redis.del(REDIS_REFRESH_KEY(userId));
    throw new Error("refresh_failed: " + txt);
  }

  const data = await tokenRes.json() as TokenResponse; // access_token, expires_in, refresh_token

  // cache new access token
  const expiresAt = Date.now() + data.expires_in * 1000;
  await redis.set(REDIS_ACCESS_KEY(userId), JSON.stringify({ token: data.access_token, expiresAt }), { PX: (data.expires_in - 30) * 1000 });

  // if Spotify returned a new refresh_token, replace it in storage
  if (data.refresh_token) {
    const newStored: StoredRefresh = {
      ...stored,
      encryptedRefreshToken: encrypt(String(data.refresh_token))
    };
    await redis.set(REDIS_REFRESH_KEY(userId), JSON.stringify(newStored));
  }

  return data.access_token;
}

// /* -------------------- User Profile and Playlist Fetch -------------------- */

/**
 * getUserProfile(userId) -> returns Spotify profile object from GET /v1/me
 * Useful to fetch spotify user's `id` (spotify_user_id), display name, etc.
 * - https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile
 */
async function getUserProfile(userId: string): Promise<any> {
  const token = await getValidAccessToken(userId);
  const r = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (r.status === 401) {
    // try refresh once
    const token2 = await getValidAccessToken(userId);
    const r2 = await fetch("https://api.spotify.com/v1/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token2}` }
    });
    if (!r2.ok) throw new Error(`Failed to fetch profile: ${r2.status} ${await r2.text()}`);
    return r2.json();
  }

  if (!r.ok) throw new Error(`Failed to fetch profile: ${r.status} ${await r.text()}`);
  return r.json();
}

/**
 * fetchAllPlaylists(userId)
 * - uses GET /v1/me/playlists with pagination (limit up to 50)
 * - returns { profile, playlists: Playlist[] }
 * Playlist items are returned as-is from Spotify.
 * https://developer.spotify.com/documentation/web-api/reference/get-a-list-of-current-users-playlists
 */
export async function fetchAllPlaylists(userId: string): Promise<{ profile: any; playlists: any[] }> {
  const profile = await getUserProfile(userId);
  const playlists: any[] = [];

  const limit = 50;
  let offset = 0;
  while (true) {
    const token = await getValidAccessToken(userId);
    const url = `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`;
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (r.status === 401) {
      // try refresh once and retry this page
      const token2 = await getValidAccessToken(userId);
      const r2 = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token2}` } });
      if (!r2.ok) throw new Error(`Failed to fetch playlists: ${r2.status} ${await r2.text()}`);
      const page = await r2.json() as CurrentUserPlaylists;
      playlists.push(...(page.items || []));
      // fetch all playlists for the user
      if (!page.next || page.items.length === 0) break;
      offset += page.items.length;
      continue;
    }

    if (!r.ok) {
      throw new Error(`Failed to fetch playlists: ${r.status} ${await r.text()}`);
    }

    const page = await r.json() as CurrentUserPlaylists;
    playlists.push(...(page.items || []));
    if (!page.next || page.items.length === 0) break;
    offset += page.items.length;
  }

  return { profile, playlists };
}