import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth";
import { db, activeSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: number;
  userType: string;
  email?: string;
  mobile?: string;
  participantId?: number;
  assignedTrack?: string;
  assignedPlace?: string;
  permissions?: string[];
}


declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: number;
    }
  }
}

const DEFAULT_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

async function getSessionDurationMs(): Promise<number> {
  return DEFAULT_SESSION_DURATION_MS;
}

/** Invalidate the cache so the next request re-reads the DB value. */
export function invalidateSessionTimeoutCache() {
  // No-op fallback
}

export function requireAuth(allowedTypes?: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let token = "";
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Verify JWT signature & expiry
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Validate against server-side session store
    const [session] = await db
      .select()
      .from(activeSessionsTable)
      .where(eq(activeSessionsTable.sessionToken, token));

    if (!session) {
      res.status(401).json({ error: "Session not found. Please log in again." });
      return;
    }

    if (session.revokedAt) {
      res.status(401).json({ error: "Session has been revoked. Please log in again." });
      return;
    }

    const now = new Date();
    if (session.expiresAt < now) {
      res.status(401).json({ error: "Session expired. Please log in again." });
      return;
    }

    // Refresh lastSeenAt and extend expiresAt (sliding window) - throttled to max once per minute to reduce DB write contention
    const nowMs = now.getTime();
    const lastSeenMs = session.lastSeenAt.getTime();
    if (nowMs - lastSeenMs > 60_000) {
      const isParticipant = session.userType === "participant";
      const sessionDurationMs = isParticipant ? 10 * 24 * 60 * 60 * 1000 : await getSessionDurationMs();
      const newExpiry = new Date(nowMs + sessionDurationMs);
      await db
        .update(activeSessionsTable)
        .set({ lastSeenAt: now, expiresAt: newExpiry })
        .where(eq(activeSessionsTable.id, session.id));
    }

    const user = payload as unknown as AuthUser;

    // super_admin bypasses all role restrictions
    if (user.userType === "super_admin") {
      req.user = user;
      req.sessionId = session.id;
      next();
      return;
    }

    if (allowedTypes && !allowedTypes.includes(user.userType)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    req.user = user;
    req.sessionId = session.id;
    next();
  };
}
