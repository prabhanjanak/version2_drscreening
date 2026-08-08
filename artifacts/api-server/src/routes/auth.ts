import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { db, systemUsersTable, activeSessionsTable } from "@workspace/db";
import { hashPassword, comparePassword, signToken } from "../lib/auth";
import { parseDevice } from "../lib/parseDevice";
import { requireAuth } from "../middlewares/requireAuth";
import { dispatchOtp, verifyOtpCode } from "../lib/otp";
import { getSystemSettings } from "../lib/settings";

const router = Router();

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
  const sessionDurationMs = 365 * 24 * 60 * 60 * 1000; // 365 days long-lived mobile and staff session
  const expiresAt = new Date(now.getTime() + sessionDurationMs);
  
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

// POST /api/auth/login - Unified login endpoint
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
      .where(or(eq(systemUsersTable.empId, identifier), eq(systemUsersTable.email, identifier)));

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
      email: user.email || undefined,
      mobile: user.mobile || undefined,
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

// PATCH /api/auth/profile - Update personal profile details
router.patch("/auth/profile", requireAuth(), async (req, res): Promise<void> => {
  const { name, email, mobile } = req.body;

  try {
    const [user] = await db
      .select()
      .from(systemUsersTable)
      .where(eq(systemUsersTable.id, req.user!.id));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await db
      .update(systemUsersTable)
      .set({
        name: name !== undefined ? name.trim() : user.name,
        email: email !== undefined ? email.trim() : user.email,
        mobile: mobile !== undefined ? mobile.trim() : user.mobile,
      })
      .where(eq(systemUsersTable.id, user.id));

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update profile: " + err.message });
  }
});

// POST /api/auth/send-otp - Dispatch OTP to registered Email and/or WhatsApp
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const { identifier, email, mobile, purpose } = req.body;

  try {
    let targetEmail = email;
    let targetMobile = mobile;
    let userId: number | undefined;

    if (identifier) {
      const [u] = await db
        .select()
        .from(systemUsersTable)
        .where(or(eq(systemUsersTable.empId, identifier), eq(systemUsersTable.email, identifier)));

      if (u) {
        userId = u.id;
        targetEmail = targetEmail || u.email;
        targetMobile = targetMobile || u.mobile;
      }
    }

    if (!targetEmail && !targetMobile) {
      res.status(400).json({ error: "No email address or mobile number provided for OTP dispatch." });
      return;
    }

    const result = await dispatchOtp({
      userId,
      email: targetEmail,
      mobile: targetMobile,
      purpose: purpose || "password_change",
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to send OTP: " + err.message });
  }
});

// POST /api/auth/set-password-otp - Dedicated OTP request endpoint for first-time login passcode setup
router.post("/auth/set-password-otp", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email address is required" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(systemUsersTable)
      .where(eq(systemUsersTable.email, email.trim()));

    const result = await dispatchOtp({
      userId: user?.id,
      email: email.trim(),
      mobile: user?.mobile || undefined,
      purpose: "first_login",
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to send OTP: " + err.message });
  }
});

// POST /api/auth/profile/reset-password-otp - Profile modal OTP request
router.post("/auth/profile/reset-password-otp", requireAuth(), async (req, res): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(systemUsersTable)
      .where(eq(systemUsersTable.id, req.user!.id));

    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    const targetEmail = req.body.email || user.email;
    const targetMobile = user.mobile;

    if (!targetEmail && !targetMobile) {
      res.status(400).json({ error: "User profile has no email or mobile configured." });
      return;
    }

    const result = await dispatchOtp({
      userId: user.id,
      email: targetEmail || undefined,
      mobile: targetMobile || undefined,
      purpose: "password_change",
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to send OTP: " + err.message });
  }
});

// POST /api/auth/profile/reset-password-verify - Verify OTP and update user password
router.post("/auth/profile/reset-password-verify", requireAuth(), async (req, res): Promise<void> => {
  const { otp, newPassword } = req.body;

  if (!otp || !newPassword) {
    res.status(400).json({ error: "OTP code and new password are required." });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters." });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(systemUsersTable)
      .where(eq(systemUsersTable.id, req.user!.id));

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const verification = await verifyOtpCode({
      userId: user.id,
      email: user.email || undefined,
      mobile: user.mobile || undefined,
      otpCode: otp,
      purpose: "password_change",
    });

    if (!verification.valid) {
      res.status(400).json({ error: verification.message });
      return;
    }

    const hash = await hashPassword(newPassword);
    await db
      .update(systemUsersTable)
      .set({ passwordHash: hash, mustChangePassword: false })
      .where(eq(systemUsersTable.id, user.id));

    res.json({ success: true, message: "Password successfully updated." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update password: " + err.message });
  }
});

// POST /api/auth/change-password - Change password with mandatory OTP check when required
router.post("/auth/change-password", requireAuth(), async (req, res): Promise<void> => {
  const { currentPassword, newPassword, otp } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new password are required" });
    return;
  }

  try {
    const settings = await getSystemSettings();
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

    if (settings.require_otp_password_change || otp) {
      if (!otp) {
        res.status(400).json({ error: "Security Policy Enforcement: OTP code is required to change password." });
        return;
      }

      const verification = await verifyOtpCode({
        userId: user.id,
        email: user.email || undefined,
        mobile: user.mobile || undefined,
        otpCode: otp,
        purpose: "password_change",
      });

      if (!verification.valid) {
        res.status(400).json({ error: verification.message });
        return;
      }
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

export default router;
