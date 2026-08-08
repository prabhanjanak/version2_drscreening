import { db, patientsTable } from "@workspace/db";
import { asc } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Migrates and re-aligns ALL existing patient records in production to the required standard:
 * SEH/<CAMPCODE>/<DDMMYYYY>/<NONREPEATABLE_GLOBAL_SERIAL_NUMBER>
 *
 * Example:
 * Patient 1: SEH/AYN/07082026/0001
 * Patient 2: SEH/TTH/08082026/0002
 * Patient 3: SEH/AYN/08082026/0003
 */
export async function migrateExistingPatientIds(): Promise<void> {
  try {
    const allPatients = await db
      .select()
      .from(patientsTable)
      .orderBy(asc(patientsTable.date), asc(patientsTable.createdAt), asc(patientsTable.id));

    if (!allPatients || allPatients.length === 0) {
      return;
    }

    logger.info({ count: allPatients.length }, "Checking and migrating existing patient Unique IDs to standard SEH/CAMPCODE/DDMMYYYY/SERIAL...");

    for (let i = 0; i < allPatients.length; i++) {
      const p = allPatients[i];
      const serialNum = i + 1;
      const serialPadded = serialNum.toString().padStart(4, "0");

      // Extract camp code (e.g. AYN, TTH, SHM)
      let campCode = (p.screeningPlaceCode || "").toUpperCase().trim();
      if (!campCode) {
        // Fallback from existing uniqueId if screeningPlaceCode is empty
        const parts = (p.uniqueId || "").split("/");
        if (parts.length >= 3 && parts[1] !== "DR") {
          campCode = parts[1].toUpperCase().trim();
        } else if (parts.length >= 4 && parts[2]) {
          campCode = parts[2].toUpperCase().trim();
        } else {
          campCode = "SHM";
        }
      }

      // Format date DDMMYYYY
      const dateStr = p.date || new Date().toISOString().split("T")[0];
      const dateParts = dateStr.split("-");
      const ddmmyyyy = dateParts.length === 3 ? `${dateParts[2]}${dateParts[1]}${dateParts[0]}` : dateStr.replace(/[^0-9]/g, "");

      const expectedUniqueId = `SEH/${campCode}/${ddmmyyyy}/${serialPadded}`;

      // Update if uniqueId or serialNumber does not match the continuous standard
      if (p.uniqueId !== expectedUniqueId || p.serialNumber !== serialNum) {
        // Step 1: Temporarily update with temp uniqueId to avoid uniqueness collision during bulk migration
        const tempId = `TEMP_MIGRATE_${p.id}_${Date.now()}`;
        await db
          .update(patientsTable)
          .set({ uniqueId: tempId, serialNumber: serialNum })
          .where(asc(patientsTable.id));
      }
    }

    // Step 2: Assign final formatted uniqueId
    for (let i = 0; i < allPatients.length; i++) {
      const p = allPatients[i];
      const serialNum = i + 1;
      const serialPadded = serialNum.toString().padStart(4, "0");

      let campCode = (p.screeningPlaceCode || "").toUpperCase().trim();
      if (!campCode) {
        const parts = (p.uniqueId || "").split("/");
        if (parts.length >= 3 && parts[1] !== "DR" && !parts[1].startsWith("TEMP")) {
          campCode = parts[1].toUpperCase().trim();
        } else if (parts.length >= 4 && parts[2]) {
          campCode = parts[2].toUpperCase().trim();
        } else {
          campCode = "SHM";
        }
      }

      const dateStr = p.date || new Date().toISOString().split("T")[0];
      const dateParts = dateStr.split("-");
      const ddmmyyyy = dateParts.length === 3 ? `${dateParts[2]}${dateParts[1]}${dateParts[0]}` : dateStr.replace(/[^0-9]/g, "");

      const expectedUniqueId = `SEH/${campCode}/${ddmmyyyy}/${serialPadded}`;

      await db
        .update(patientsTable)
        .set({
          uniqueId: expectedUniqueId,
          serialNumber: serialNum,
          screeningPlaceCode: campCode,
        })
        .where(asc(patientsTable.id));
    }

    logger.info("All existing patient records successfully updated to SEH/CAMPCODE/DATE/SERIAL standard!");
  } catch (err: any) {
    logger.error({ error: err.message }, "Patient ID migration note");
  }
}
