import { Router } from "express";
import { eq, isNull, gt, and } from "drizzle-orm";
import { db, systemUsersTable, activeSessionsTable } from "@workspace/db";
import { hashPassword, comparePassword, signToken, verifyToken } from "../lib/auth";
import { parseDevice } from "../lib/parseDevice";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();
const DEFAULT_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function getClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return (typeof forwarded === "string" ? forwarded : forwarded[0]).split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

async function createSession(token: string, userId: number, userType: string, userName: string, req: any) {
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"];
  const { deviceType, deviceName } = parseDevice(ua);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_SESSION_DURATION_MS);
  
  await db.insert(activeSessionsTable).values({
    sessionToken: token,
    userId,
    userType,
    userName,
    ipAddress: ip,
    userAgent: ua ?? null,
    deviceType,
    deviceName,
    expiresAt,
  });
}

// POST /api/auth/login - Unified login endpoint for Super Admin, Doctor, and Field Users
router.post("/auth/login", async (req, res): Promise<void> => {
  const identifier: string = (req.body.identifier ?? req.body.username ?? "").toString().trim();
  const password = req.body.password ?? "";

  if (!identifier || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(systemUsersTable)
      .where(eq(systemUsersTable.empId, identifier));

    if (!user || user.status !== "active") {
      res.status(401).json({ error: "Invalid credentials or account is deactivated" });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signToken({
      id: user.id,
      userType: user.userType,
      assignedTrack: user.assignedTrack,
      permissions: user.permissions || [],
    });

    await createSession(token, user.id, user.userType, user.name, req);

    res.json({
      token,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        name: user.name,
        empId: user.empId,
        email: user.email,
        mobile: user.mobile,
        userType: user.userType,
        assignedPlace: user.assignedPlace,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

// GET /api/auth/me - Validate session and get current user profile
router.get("/auth/me", requireAuth(), async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(systemUsersTable)
      .where(eq(systemUsersTable.id, req.user.id));

    if (!user || user.status !== "active") {
      res.status(401).json({ error: "Account deactivated or not found" });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      empId: user.empId,
      email: user.email,
      mobile: user.mobile,
      userType: user.userType,
      assignedPlace: user.assignedPlace,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user session: " + err.message });
  }
});

// POST /api/auth/logout - Revoke session token
router.post("/auth/logout", async (req, res): Promise<void> => {
  let token = "";
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  if (token) {
    await db
      .update(activeSessionsTable)
      .set({ revokedAt: new Date() })
      .where(eq(activeSessionsTable.sessionToken, token));
  }

  res.json({ success: true, message: "Logged out successfully" });
});

// POST /api/auth/change-password - Change password manually
router.post("/auth/change-password", requireAuth(), async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new password are required" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(systemUsersTable)
      .where(eq(systemUsersTable.id, req.user!.id));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Incorrect current password" });
      return;
    }

    const hash = await hashPassword(newPassword);
    await db
      .update(systemUsersTable)
      .set({ passwordHash: hash, mustChangePassword: false })
      .where(eq(systemUsersTable.id, user.id));

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update password: " + err.message });
  }
});

export default router;
