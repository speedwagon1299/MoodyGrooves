import { Request, Response, NextFunction } from "express";
import { getSession } from "../lib/session";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "moody_session";

/**
 * requireAuth: reads session cookie, fetches session from redis, attaches req.user = { userId }
 * Returns 401 if not authenticated.
 */
export default async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.cookies?.[COOKIE_NAME];
    if (!sessionId) return res.status(401).json({ error: "not_authenticated" });

    const session = await getSession(sessionId);
    if (!session || !session.userId) return res.status(401).json({ error: "invalid_session" });

    (req as any).user = { userId: session.userId };
    return next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}
