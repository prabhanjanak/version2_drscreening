import bcrypt from "bcryptjs";
import { db, systemUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export async function ensureSuperAdmin() {
  try {
    const passwordHash = await bcrypt.hash("Sankara@123", 10);

    // Ensure Super Admin Prabhanjan exists
    const superAdminData = {
      empId: "010177",
      name: "Prabhanjan",
      email: "prabhanjan@sankaraeye.com",
      mobile: "8951568286",
      userType: "super_admin",
      passwordHash,
      mustChangePassword: false,
      permissions: ["attendance", "goodies", "food"],
    };

    const [existingSuper] = await db
      .select()
      .from(systemUsersTable)
      .where(eq(systemUsersTable.empId, superAdminData.empId))
      .limit(1);

    if (!existingSuper) {
      await db.insert(systemUsersTable).values(superAdminData);
      logger.info({ empId: superAdminData.empId }, "Super admin Prabhanjan automatically created.");
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to ensure super admin on startup.");
  }
}
