// src/lib/session.ts
import { v4 as uuidv4 } from "uuid";
import { redis } from "./redis";

const SESS_PREFIX = "session:";

/**
 * Create and store a session in Redis.
 * Returns the generated sessionId.
 */
export async function createSession(data: Record<string, any>, ttlSeconds = 60 * 60 * 24 * 7) {
  const sessionId = uuidv4();
  const key = SESS_PREFIX + sessionId;
  await redis.set(key, JSON.stringify(data), { EX: ttlSeconds });
  return sessionId;
}

/** Read session by sessionId (returns parsed object or null) */
export async function getSession(sessionId: string) {
  if (!sessionId) return null;
  const raw = await redis.get(SESS_PREFIX + sessionId);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Delete one session by sessionId */
export async function delSession(sessionId: string) {
  if (!sessionId) return;
  await redis.del(SESS_PREFIX + sessionId);
}
