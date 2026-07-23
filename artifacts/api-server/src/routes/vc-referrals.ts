import { Router } from "express";
import { eq, and, inArray, desc } from "drizzle-orm";
import { db, vcReferralsTable, visionCentersTable, screeningPlacesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/vc-referrals
router.get("/vc-referrals", requireAuth(), async (req, res) => {
  try {
    const { targetCampCode, visionCenterCode, sankaraUnit, status } = req.query;

    let conditions = [];
    if (typeof targetCampCode === "string" && targetCampCode) {
      conditions.push(eq(vcReferralsTable.targetCampCode, targetCampCode));
    }
    if (typeof visionCenterCode === "string" && visionCenterCode) {
      conditions.push(eq(vcReferralsTable.visionCenterCode, visionCenterCode));
    }
    if (typeof status === "string" && status) {
      conditions.push(eq(vcReferralsTable.status, status));
    }

    // Filter by unit if requested or scoped
    if (typeof sankaraUnit === "string" && sankaraUnit) {
      const unitVCs = await db.select({ shortCode: visionCentersTable.shortCode })
        .from(visionCentersTable)
        .where(eq(visionCentersTable.sankaraUnit, sankaraUnit));
      const vcCodes = unitVCs.map(v => v.shortCode);
      if (vcCodes.length === 0) {
        res.json([]);
        return;
      }
      conditions.push(inArray(vcReferralsTable.visionCenterCode, vcCodes));
    }

    const referrals = await db.select({
      id: vcReferralsTable.id,
      patientName: vcReferralsTable.patientName,
      age: vcReferralsTable.age,
      gender: vcReferralsTable.gender,
      phone: vcReferralsTable.phone,
      address: vcReferralsTable.address,
      visionCenterId: vcReferralsTable.visionCenterId,
      visionCenterCode: vcReferralsTable.visionCenterCode,
      visionCenterName: visionCentersTable.name,
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
    .leftJoin(screeningPlacesTable, eq(vcReferralsTable.targetCampCode, screeningPlacesTable.shortCode))
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
      patientName, age, gender, phone, address,
      visionCenterCode, targetCampCode, referralDate, drNotes
    } = req.body;

    if (!patientName || !age || !gender || !phone || !visionCenterCode || !targetCampCode) {
      res.status(400).json({ error: "Missing required referral fields (patientName, age, gender, phone, visionCenterCode, targetCampCode)" });
      return;
    }

    // Lookup vision center
    const [vc] = await db.select().from(visionCentersTable).where(eq(visionCentersTable.shortCode, visionCenterCode));
    if (!vc) {
      res.status(400).json({ error: `Vision center code ${visionCenterCode} not found` });
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const [created] = await db.insert(vcReferralsTable).values({
      patientName,
      age: parseInt(age, 10),
      gender,
      phone,
      address: address || null,
      visionCenterId: vc.id,
      visionCenterCode: vc.shortCode,
      targetCampCode,
      referralDate: referralDate || today,
      drNotes: drNotes || null,
      status: "pending",
      createdBy: req.user?.id || null,
    }).returning();

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create VC referral: " + err.message });
  }
});

// PATCH /api/vc-referrals/:id/convert
router.patch("/vc-referrals/:id/convert", requireAuth(), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const { patientId } = req.body;

    const [updated] = await db.update(vcReferralsTable)
      .set({
        status: "completed",
        convertedPatientId: patientId ? parseInt(patientId, 10) : null,
      })
      .where(eq(vcReferralsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to mark VC referral as completed: " + err.message });
  }
});

export default router;
