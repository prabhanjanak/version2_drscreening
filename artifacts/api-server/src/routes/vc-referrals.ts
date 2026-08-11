import { Router } from "express";
import { eq, and, inArray, desc, ilike, sql } from "drizzle-orm";
import { db, vcReferralsTable, visionCentersTable, screeningPlacesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/vc-referrals
router.get("/vc-referrals", requireAuth(), async (req, res) => {
  try {
    const { targetCampCode, visionCenterCode, sankaraUnit, status, referrerType } = req.query;

    let conditions = [];
    if (typeof targetCampCode === "string" && targetCampCode.trim()) {
      conditions.push(ilike(vcReferralsTable.targetCampCode, targetCampCode.trim()));
    }
    if (typeof visionCenterCode === "string" && visionCenterCode.trim()) {
      conditions.push(ilike(vcReferralsTable.visionCenterCode, visionCenterCode.trim()));
    }
    if (typeof status === "string" && status.trim() && status !== "all") {
      conditions.push(eq(vcReferralsTable.status, status.trim()));
    }
    if (typeof referrerType === "string" && referrerType.trim()) {
      conditions.push(eq(vcReferralsTable.referrerType, referrerType.trim()));
    }

    // Filter by unit if requested or scoped
    if (typeof sankaraUnit === "string" && sankaraUnit.trim()) {
      const unitVCs = await db.select({ shortCode: visionCentersTable.shortCode })
        .from(visionCentersTable)
        .where(eq(visionCentersTable.sankaraUnit, sankaraUnit.trim()));
      const vcCodes = unitVCs.map(v => v.shortCode);
      if (vcCodes.length > 0) {
        conditions.push(inArray(vcReferralsTable.visionCenterCode, vcCodes));
      }
    }

    const referrals = await db.select({
      id: vcReferralsTable.id,
      patientName: vcReferralsTable.patientName,
      age: vcReferralsTable.age,
      gender: vcReferralsTable.gender,
      phone: vcReferralsTable.phone,
      address: vcReferralsTable.address,
      village: vcReferralsTable.village,
      visionCenterId: vcReferralsTable.visionCenterId,
      visionCenterCode: vcReferralsTable.visionCenterCode,
      visionCenterName: visionCentersTable.name,
      referrerType: vcReferralsTable.referrerType,
      phcName: vcReferralsTable.phcName,
      randomBloodSugar: vcReferralsTable.randomBloodSugar,
      symptoms: vcReferralsTable.symptoms,
      targetCampCode: vcReferralsTable.targetCampCode,
      targetCampName: screeningPlacesTable.name,
      referralDate: vcReferralsTable.referralDate,
      drNotes: vcReferralsTable.drNotes,
      status: vcReferralsTable.status,
      convertedPatientId: vcReferralsTable.convertedPatientId,
      createdAt: vcReferralsTable.createdAt
    })
    .from(vcReferralsTable)
    .leftJoin(visionCentersTable, eq(vcReferralsTable.visionCenterId, visionCentersTable.id))
    .leftJoin(screeningPlacesTable, eq(sql`UPPER(${vcReferralsTable.targetCampCode})`, sql`UPPER(${screeningPlacesTable.shortCode})`))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(vcReferralsTable.createdAt));

    res.json(referrals);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch VC referrals: " + err.message });
  }
});

// POST /api/vc-referrals
router.post("/vc-referrals", requireAuth(), async (req, res) => {
  try {
    const {
      patientName, age, gender, phone, address, village,
      visionCenterCode, targetCampCode, referralDate, drNotes,
      referrerType, phcName, randomBloodSugar, symptoms
    } = req.body;

    if (!patientName || !age || !gender || !targetCampCode) {
      res.status(400).json({ error: "Missing required referral fields (patientName, age, gender, targetCampCode)" });
      return;
    }

    const userType = req.user?.userType || "outreach";
    const effectiveReferrerType = referrerType || (userType === "asha_worker" ? "asha_worker" : userType === "ophthalmic_officer" ? "ophthalmic_officer" : "vision_center");
    const effectiveVcCode = (visionCenterCode || req.user?.assignedPlace || "OUTREACH_REFERRAL").toUpperCase().trim();
    const cleanCampCode = targetCampCode.toUpperCase().trim();

    // Lookup vision center if code provided
    let vcId: number | null = null;
    if (effectiveVcCode && effectiveVcCode !== "OUTREACH_REFERRAL" && effectiveVcCode !== "ASHA_WORKER") {
      const [vc] = await db.select().from(visionCentersTable).where(eq(sql`UPPER(${visionCentersTable.shortCode})`, effectiveVcCode));
      if (vc) {
        vcId = vc.id;
      }
    }

    const today = new Date().toISOString().split("T")[0];

    let created;
    try {
      [created] = await db.insert(vcReferralsTable).values({
        patientName: patientName.trim(),
        age: parseInt(String(age), 10) || 45,
        gender: gender || "Female",
        phone: phone ? phone.trim() : "N/A",
        address: (address || village || "").trim() || null,
        village: (village || address || "").trim() || null,
        visionCenterId: vcId,
        visionCenterCode: effectiveVcCode,
        referrerType: effectiveReferrerType,
        phcName: phcName ? phcName.trim() : null,
        randomBloodSugar: randomBloodSugar ? randomBloodSugar.trim() : null,
        symptoms: symptoms ? symptoms.trim() : null,
        targetCampCode: cleanCampCode,
        referralDate: referralDate || today,
        drNotes: drNotes ? drNotes.trim() : null,
        status: "pending",
        createdBy: req.user?.id || null,
      }).returning();
    } catch (dbErr: any) {
      // Robust fallback without foreign keys if user/VC reference doesn't exist in DB
      [created] = await db.insert(vcReferralsTable).values({
        patientName: patientName.trim(),
        age: parseInt(String(age), 10) || 45,
        gender: gender || "Female",
        phone: phone ? phone.trim() : "N/A",
        address: (address || village || "").trim() || null,
        village: (village || address || "").trim() || null,
        visionCenterId: null,
        visionCenterCode: effectiveVcCode,
        referrerType: effectiveReferrerType,
        phcName: phcName ? phcName.trim() : null,
        randomBloodSugar: randomBloodSugar ? randomBloodSugar.trim() : null,
        symptoms: symptoms ? symptoms.trim() : null,
        targetCampCode: cleanCampCode,
        referralDate: referralDate || today,
        drNotes: drNotes ? drNotes.trim() : null,
        status: "pending",
        createdBy: null,
      }).returning();
    }

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create VC/ASHA referral: " + err.message });
  }
});

// PATCH /api/vc-referrals/:id/convert
router.patch("/vc-referrals/:id/convert", requireAuth(), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid referral ID" });
      return;
    }
    const { patientId } = req.body;

    const [updated] = await db.update(vcReferralsTable)
      .set({
        status: "completed",
        convertedPatientId: patientId ? parseInt(String(patientId), 10) : null,
      })
      .where(eq(vcReferralsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to mark VC referral as completed: " + err.message });
  }
});

// PATCH /api/vc-referrals/:id/status (for No-Show / Follow-Up / Reschedule)
router.patch("/vc-referrals/:id/status", requireAuth(), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const { status, targetCampCode, drNotes } = req.body;

    if (!status) {
      res.status(400).json({ error: "Status is required" });
      return;
    }

    let updateData: Record<string, any> = { status };
    if (targetCampCode) updateData['targetCampCode'] = targetCampCode;
    if (drNotes !== undefined) updateData['drNotes'] = drNotes;

    const [updated] = await db.update(vcReferralsTable)
      .set(updateData)
      .where(eq(vcReferralsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update referral status: " + err.message });
  }
});

export default router;
