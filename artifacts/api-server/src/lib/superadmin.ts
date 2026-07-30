import bcrypt from "bcryptjs";
import { db, systemUsersTable, visionCentersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export async function ensureSuperAdmin() {
  try {
    const passwordHash = await bcrypt.hash("Sankara@123", 10);

    // 1. Seed / Update Super Admin Prabhanjan
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
    } else {
      await db.update(systemUsersTable).set(superAdminData).where(eq(systemUsersTable.id, existingSuper.id));
      logger.info({ empId: superAdminData.empId }, "Super admin Prabhanjan automatically updated.");
    }

    // 2. Seed / Update Requested Strategic User Accounts
    const defaultUsers = [
      {
        empId: "006704",
        name: "Kumaraswamy",
        email: "kumaraswamy@sankaraeye.com",
        mobile: "9845011111",
        userType: "facility_manager",
        assignedTrack: "Sankara Eye Hospital Shimoga",
        passwordHash,
        mustChangePassword: false,
      },
      {
        empId: "000338",
        name: "Avinash",
        email: "avinash@sankaraeye.com",
        mobile: "9845022222",
        userType: "admin_unit",
        assignedTrack: "Sankara Eye Hospital Shimoga",
        passwordHash,
        mustChangePassword: false,
      },
      {
        empId: "000470",
        name: "Anitha S",
        email: "anitha.s@sankaraeye.com",
        mobile: "9845033333",
        userType: "unit_head",
        assignedTrack: "Sankara Eye Hospital Shimoga",
        passwordHash,
        mustChangePassword: false,
      },
      {
        empId: "VC001",
        name: "Chitradurga Vision Center",
        email: "vc.chitradurga@sankaraeye.com",
        mobile: "9845044441",
        userType: "vision_center",
        assignedTrack: "Sankara Eye Hospital Shimoga",
        assignedPlace: "VC_CHITRA",
        passwordHash,
        mustChangePassword: false,
      },
      {
        empId: "VC002",
        name: "Channagiri Vision Center",
        email: "vc.channagiri@sankaraeye.com",
        mobile: "9845044442",
        userType: "vision_center",
        assignedTrack: "Sankara Eye Hospital Shimoga",
        assignedPlace: "VC_CHANNA",
        passwordHash,
        mustChangePassword: false,
      },
      {
        empId: "VC003",
        name: "Annur Vision Center",
        email: "vc.annur@sankaraeye.com",
        mobile: "9845044443",
        userType: "vision_center",
        assignedTrack: "Sankara Eye Hospital Coimbatore",
        assignedPlace: "VC_ANNUR",
        passwordHash,
        mustChangePassword: false,
      },
      {
        empId: "ASHA001",
        name: "Sunitha (ASHA Worker)",
        email: "asha.sunitha@sankaraeye.com",
        mobile: "9845055551",
        userType: "asha_worker",
        assignedTrack: "Sankara Eye Hospital Shimoga",
        assignedPlace: "PHC_SHIMOGA",
        passwordHash,
        mustChangePassword: false,
      },
      {
        empId: "ASHA002",
        name: "Lakshmi (ASHA Worker)",
        email: "asha.lakshmi@sankaraeye.com",
        mobile: "9845055552",
        userType: "asha_worker",
        assignedTrack: "Sankara Eye Hospital Shimoga",
        assignedPlace: "PHC_CHANNAGIRI",
        passwordHash,
        mustChangePassword: false,
      },
    ];

    for (const u of defaultUsers) {
      const [ex] = await db
        .select()
        .from(systemUsersTable)
        .where(eq(systemUsersTable.empId, u.empId))
        .limit(1);

      if (!ex) {
        await db.insert(systemUsersTable).values(u);
        logger.info({ empId: u.empId, name: u.name }, "Seeded user account successfully.");
      } else {
        await db.update(systemUsersTable).set({
          name: u.name,
          email: u.email,
          mobile: u.mobile,
          userType: u.userType,
          assignedTrack: u.assignedTrack,
          assignedPlace: u.assignedPlace || null,
          passwordHash: u.passwordHash,
          mustChangePassword: false,
        }).where(eq(systemUsersTable.id, ex.id));
        logger.info({ empId: u.empId, name: u.name }, "Updated user account successfully.");
      }
    }

    // 3. Seed Default Vision Centers into vision_centers table
    const defaultVCs = [
      {
        name: "Chitradurga Vision Center",
        shortCode: "VC_CHITRA",
        sankaraUnit: "Sankara Eye Hospital Shimoga",
        state: "Karnataka",
        district: "Chitradurga",
        taluk: "Chitradurga",
        pincode: "577501",
        address: "Near KSRTC Bus Stand, Chitradurga Main Road",
        phone: "08194-223344",
        mapsUrl: "https://maps.google.com/?q=14.2251,76.3980",
        latitude: "14.2251",
        longitude: "76.3980",
        status: "active",
      },
      {
        name: "Channagiri Vision Center",
        shortCode: "VC_CHANNA",
        sankaraUnit: "Sankara Eye Hospital Shimoga",
        state: "Karnataka",
        district: "Davanagere",
        taluk: "Channagiri",
        pincode: "577213",
        address: "Hospital Road, Channagiri Town",
        phone: "08189-221122",
        mapsUrl: "https://maps.google.com/?q=14.0270,75.9287",
        latitude: "14.0270",
        longitude: "75.9287",
        status: "active",
      },
      {
        name: "Annur Vision Center",
        shortCode: "VC_ANNUR",
        sankaraUnit: "Sankara Eye Hospital Coimbatore",
        state: "Tamil Nadu",
        district: "Coimbatore",
        taluk: "Annur",
        pincode: "641653",
        address: "Main Road, Annur",
        phone: "04254-262626",
        mapsUrl: "https://maps.google.com/?q=11.2325,77.1065",
        latitude: "11.2325",
        longitude: "77.1065",
        status: "active",
      },
    ];

    for (const vc of defaultVCs) {
      const [exVc] = await db
        .select()
        .from(visionCentersTable)
        .where(eq(visionCentersTable.shortCode, vc.shortCode))
        .limit(1);

      if (!exVc) {
        await db.insert(visionCentersTable).values(vc);
        logger.info({ shortCode: vc.shortCode }, "Seeded Vision Center record successfully.");
      } else {
        await db.update(visionCentersTable).set(vc).where(eq(visionCentersTable.id, exVc.id));
      }
    }

  } catch (error) {
    logger.error({ err: error }, "Failed to seed default accounts and vision centers on startup.");
  }
}
