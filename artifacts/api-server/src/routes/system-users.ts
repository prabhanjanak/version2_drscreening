import { Router } from "express";
import { eq, or } from "drizzle-orm";
import { db, systemUsersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { hashPassword, comparePassword, checkEmailOrMobileRegistered } from "../lib/auth";
import {
  CreateSystemUserBody,
  UpdateSystemUserParams,
  UpdateSystemUserBody,
  DeleteSystemUserParams,
} from "@workspace/api-zod";
import QRCode from "qrcode";
import { ZipArchive } from "archiver";
import { getClientBaseUrl } from "../lib/ip-helper";

const router = Router();

function buildUser(u: typeof systemUsersTable.$inferSelect) {
  const effectivePermissions = (u.userType === "admin" || u.userType === "super_admin")
    ? ["attendance", "goodies", "food"]
    : (u.permissions ?? []);
  return {
    id: u.id,
    empId: u.empId,
    name: u.name,
    email: u.email,
    mobile: u.mobile,
    userType: u.userType,
    assignedTrack: u.assignedTrack,
    mustChangePassword: u.mustChangePassword,
    permissions: effectivePermissions,
    createdAt: u.createdAt.toISOString(),
    status: u.status,
    assignedPlace: u.assignedPlace,
  };
}

// GET /system-users
router.get("/system-users", requireAuth(["admin", "super_admin"]), async (_req, res): Promise<void> => {
  const users = await db.select().from(systemUsersTable).orderBy(systemUsersTable.createdAt);
  res.json(users.map(buildUser));
});

// POST /system-users
router.post("/system-users", requireAuth(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const { empId, name, email, mobile, userType, password, assignedTrack, status, assignedPlace } = req.body;

  if (!empId || !name || !userType) {
    res.status(400).json({ error: "empId, name, and userType are required" });
    return;
  }

  // Only super_admin can create a super_admin account
  if (userType === "super_admin" && req.user?.userType !== "super_admin") {
    res.status(403).json({ error: "Only the super admin can create a super admin account" });
    return;
  }

  // Check EMP ID uniqueness
  const [existing] = await db
    .select({ id: systemUsersTable.id })
    .from(systemUsersTable)
    .where(eq(systemUsersTable.empId, empId));
  if (existing) {
    res.status(400).json({ error: "EMP ID already exists" });
    return;
  }

  if (email || mobile) {
    const checkDuplicate = await checkEmailOrMobileRegistered({
      email,
      mobile,
    });
    if (checkDuplicate) {
      res.status(400).json({ error: checkDuplicate.reason });
      return;
    }
  }

  const rawPassword = password || "Welcome@123";
  const passwordHash = await hashPassword(rawPassword);
  const reqPermissions = (req.body as { permissions?: string[] }).permissions ?? [];
  const [user] = await db
    .insert(systemUsersTable)
    .values({
      empId,
      name,
      email: email ?? null,
      mobile: mobile ?? null,
      userType,
      passwordHash,
      assignedTrack: assignedTrack ?? null,
      mustChangePassword: true,
      permissions: reqPermissions,
      status: status || "active",
      assignedPlace: assignedPlace || null,
    })
    .returning();
  res.status(201).json(buildUser(user));
});

// PATCH /system-users/:id
router.patch("/system-users/:id", requireAuth(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const targetId = parseInt(idParam as string, 10);
  if (isNaN(targetId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [targetUser] = await db
    .select()
    .from(systemUsersTable)
    .where(eq(systemUsersTable.id, targetId))
    .limit(1);

  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Only super_admin can modify a super_admin account
  if (targetUser.userType === "super_admin" && req.user?.userType !== "super_admin") {
    res.status(403).json({ error: "Only the super admin can modify a super admin account" });
    return;
  }

  // Only super_admin can promote/demote to/from super_admin
  if ((req.body.userType === "super_admin" || (req.body.userType !== undefined && targetUser.userType === "super_admin")) && req.user?.userType !== "super_admin") {
    res.status(403).json({ error: "Only the super admin can assign or revoke the super admin role" });
    return;
  }

  if (req.body.email || req.body.mobile) {
    const checkDuplicate = await checkEmailOrMobileRegistered({
      email: req.body.email,
      mobile: req.body.mobile,
      excludeSystemUserId: targetId,
    });
    if (checkDuplicate) {
      res.status(400).json({ error: checkDuplicate.reason });
      return;
    }
  }
  const updateData: Record<string, unknown> = {};
  if (req.body.empId !== undefined) updateData.empId = req.body.empId;
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.email !== undefined) updateData.email = req.body.email;
  if (req.body.mobile !== undefined) updateData.mobile = req.body.mobile;
  if (req.body.userType !== undefined) updateData.userType = req.body.userType;
  if (req.body.assignedTrack !== undefined) updateData.assignedTrack = req.body.assignedTrack;
  if (req.body.status !== undefined) updateData.status = req.body.status;
  if (req.body.assignedPlace !== undefined) updateData.assignedPlace = req.body.assignedPlace;
  const patchPermissions = (req.body as { permissions?: string[] }).permissions;
  if (patchPermissions !== undefined) updateData.permissions = patchPermissions;
  const newPassword = req.body.password;
  if (newPassword) {
    updateData.passwordHash = await hashPassword(newPassword);
    updateData.mustChangePassword = false;
  }

  const [user] = await db
    .update(systemUsersTable)
    .set(updateData)
    .where(eq(systemUsersTable.id, targetId))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(buildUser(user));
});

// DELETE /system-users/:id
router.delete("/system-users/:id", requireAuth(["admin", "super_admin"]), async (req, res): Promise<void> => {
  const params = DeleteSystemUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [targetUser] = await db
    .select()
    .from(systemUsersTable)
    .where(eq(systemUsersTable.id, params.data.id))
    .limit(1);

  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Only super_admin can delete a super_admin account
  if (targetUser.userType === "super_admin" && req.user?.userType !== "super_admin") {
    res.status(403).json({ error: "Only the super admin can delete a super admin account" });
    return;
  }
  const [deleted] = await db
    .delete(systemUsersTable)
    .where(eq(systemUsersTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.sendStatus(204);
});

// POST /system-users/:id/reset-password  — admin resets to Welcome@123 + force change
router.post("/system-users/:id/reset-password", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const passwordHash = await hashPassword("Welcome@123");
  const [user] = await db
    .update(systemUsersTable)
    .set({ passwordHash, mustChangePassword: true })
    .where(eq(systemUsersTable.id, id))
    .returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ message: "Password reset to Welcome@123, user must change on next login" });
});

// POST /auth/staff/change-password  — staff member changes their own password after force reset
router.post("/auth/staff/change-password", requireAuth(), async (req, res): Promise<void> => {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "currentPassword and newPassword (min 6 chars) are required" });
    return;
  }

  const [sysUser] = await db.select().from(systemUsersTable).where(eq(systemUsersTable.id, user.id));
  if (!sysUser) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await comparePassword(currentPassword, sysUser.passwordHash);
  if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }

  const passwordHash = await hashPassword(newPassword);
  await db.update(systemUsersTable).set({ passwordHash, mustChangePassword: false }).where(eq(systemUsersTable.id, user.id));
  res.json({ message: "Password changed successfully" });
});

// GET /system-users/qr-batch
router.get("/system-users/qr-batch", requireAuth(["admin"]), async (req, res): Promise<void> => {
  try {
    const allUsers = await db.select().from(systemUsersTable).orderBy(systemUsersTable.createdAt);
    
    const archive = new ZipArchive({ zlib: { level: 9 } });
    res.setHeader("Content-Disposition", `attachment; filename="vision2020_staff_qr_codes_${Date.now()}.zip"`);
    res.setHeader("Content-Type", "application/zip");
    archive.pipe(res);
    
    archive.on("error", (err: any) => {
      console.error("ZIP Archive Error:", err);
    });

    const baseUrl = getClientBaseUrl(req);

    for (const user of allUsers) {
      const cleanName = user.name
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const cleanEmpId = user.empId
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const cleanRole = user.userType
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      const qrUrl = `${baseUrl}/q/STAFF-${user.empId}`;
      const qrBuffer = await QRCode.toBuffer(qrUrl, { width: 300, margin: 2 });
      
      archive.append(qrBuffer, { name: `${cleanName}_${cleanEmpId}_${cleanRole}.png` });
    }

    await archive.finalize();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Failed to batch export QR codes" });
    }
  }
});

// GET /system-users/:id/qr
router.get("/system-users/:id/qr", requireAuth(["admin"]), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [sysUser] = await db.select().from(systemUsersTable).where(eq(systemUsersTable.id, id));
  if (!sysUser) { res.status(404).json({ error: "User not found" }); return; }

  const baseUrl = getClientBaseUrl(req);
  const qrUrl = `${baseUrl}/q/STAFF-${sysUser.empId}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2 });

  const firstName = sysUser.name.split(" ")[0];
  res.json({
    qr1: {
      type: "staff_registration",
      dataUrl: qrDataUrl,
      label: "Staff QR",
      downloadName: `${firstName}_StaffQR.png`,
    }
  });
});

export default router;
