import { redis } from "../lib/redis";
import { encrypt, decrypt } from "../utils/crypto";
import { StoredRefresh, TokenResponse, CurrentUserPlaylists, PlaylistTracksPage,TrackInfo } from "@/types";

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

/**
 * fetchAllSongsFromPlaylists(userId, hrefs)
 * - For each playlist href, fetches all tracks with pagination
 * - Deduplicates tracks by "song by artist" and by Spotify track ID
 * - Returns { uniqueSongs: string[], uniqueHrefIds: string[] }
 * - https://developer.spotify.com/documentation/web-api/reference/get-playlists-tracks
 */
export async function fetchAllSongsFromPlaylists(userId: string, hrefs: string[]): Promise<{ uniqueSongs: string[]; uniqueHrefIds: string[] }> {
  const songSet = new Set<string>();
  const hrefIdSet = new Set<string>();
  const limit = 100;

  for (const href of hrefs) {
    if (!href) continue;

    let offset = 0;
    while (true) {
      const url = new URL(href);
      url.searchParams.set("market", "ES");
      url.searchParams.set("fields", "items(track.artists.name,track.name,track.href)");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));

      let token = await getValidAccessToken(userId);
      let r = await fetch(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (r.status === 401) {
        // Refresh and retry once
        token = await getValidAccessToken(userId);
        r = await fetch(url.toString(), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error(`Failed fetching tracks for ${href}: ${r.status} ${txt}`);
        break;
      }

      const page = (await r.json()) as PlaylistTracksPage;
      const items = page.items || [];

      for (const it of items) {
        const track = it.track;
        if (!track?.name) continue;
        const name = track.name.trim();
        const artist = track.artists?.[0]?.name?.trim() || "Unknown Artist";
        songSet.add(`${name} by ${artist}`);
        
        const href = track.href || "";
        // get only spotify track ID
        const hrefId = href.substring(href.lastIndexOf("/") + 1);
        hrefIdSet.add(hrefId || "");
      }

      if (!page.next || items.length === 0) break;
      offset += items.length;
    }
  }

  const uniqueSongs = Array.from(songSet);
  const uniqueHrefIds = Array.from(hrefIdSet);
  return { uniqueSongs, uniqueHrefIds };
}


/**
 * Fetch detailed track information for up to N track IDs (Spotify allows up to 50 per request).
 * https://developer.spotify.com/documentation/web-api/reference/get-several-tracks
 * @param userId - your internal user id (used to get a valid Spotify access token)
 * @param trackIds - array of Spotify track IDs (e.g. ["4YzzeycRmg12c4SzgJDrFx", ...])
 * @returns Promise<TrackInfo[]>
 */
export async function fetchTracksInfo(
  userId: string,
  trackIds: string[]
): Promise<TrackInfo[]> {
  if (!Array.isArray(trackIds) || trackIds.length === 0) return [];

  const BATCH_SIZE = 50;
  const batches: string[][] = [];
  for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
    batches.push(trackIds.slice(i, i + BATCH_SIZE));
  }

  // helper to fetch a single batch, with retry on 401
  async function fetchBatch(ids: string[]): Promise<TrackInfo[]> {
    const url = `https://api.spotify.com/v1/tracks?ids=${ids.join(",")}`;

    let token = await getValidAccessToken(userId);
    let res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      // refresh and retry once
      token = await getValidAccessToken(userId);
      res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to fetch tracks info: ${res.status} ${text}`);
    }

    const body = (await res.json()) as { tracks?: Array<any | null> };
    const items = body.tracks || [];

    const out: TrackInfo[] = [];
    for (const t of items) {
      if (!t) continue; // may return null for invalid tracks
      const id: string = t.id;
      const name: string = t.name ?? "";
      const artists: string[] = Array.isArray(t.artists)
        ? t.artists.map((a: any) => a?.name ?? "").filter(Boolean)
        : [];
      const album: string = t.album?.name ?? "";
      const durationMs: number = typeof t.duration_ms === "number" ? t.duration_ms : Number(t.duration) || 0;
      out.push({ id, name, artists, album, durationMs });
    }
    return out;
  }

  const results: TrackInfo[] = [];
  for (const batch of batches) {
    const r = await fetchBatch(batch);
    results.push(...r);
  }

  return results;
}
