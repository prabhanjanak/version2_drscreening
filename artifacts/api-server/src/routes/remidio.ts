import { Router } from "express";
import { eq, or, ilike, desc, sql } from "drizzle-orm";
import { db, patientsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import fs from "fs";
import path from "path";

const router = Router();

// Store memory configuration for Remidio Camera settings
let remidioConfig = {
  enabled: true,
  mode: "cloud_api", // "cloud_api" | "local_hotspot" | "webhook"
  apiKey: "REM_SANKARA_API_KEY_SECURE_2026",
  cloudEndpoint: "https://api.medios.remidio.com/v1/encounters",
  localHotspotIp: "192.168.1.50:8080",
  autoAttachToLatestPatient: true,
  lastSyncAt: new Date().toISOString(),
};

// GET /api/integrations/remidio/config - Get current Remidio Integration Config
router.get("/integrations/remidio/config", requireAuth(), (_req, res) => {
  res.json(remidioConfig);
});

// POST /api/integrations/remidio/config - Update Remidio Integration Config
router.post("/integrations/remidio/config", requireAuth(), (req, res) => {
  const { enabled, mode, apiKey, cloudEndpoint, localHotspotIp, autoAttachToLatestPatient } = req.body;

  remidioConfig = {
    ...remidioConfig,
    ...(enabled !== undefined ? { enabled: Boolean(enabled) } : {}),
    ...(mode ? { mode } : {}),
    ...(apiKey ? { apiKey } : {}),
    ...(cloudEndpoint ? { cloudEndpoint } : {}),
    ...(localHotspotIp ? { localHotspotIp } : {}),
    ...(autoAttachToLatestPatient !== undefined ? { autoAttachToLatestPatient: Boolean(autoAttachToLatestPatient) } : {}),
    lastSyncAt: new Date().toISOString(),
  };

  res.json({ message: "Remidio integration settings saved", config: remidioConfig });
});

// GET /api/integrations/remidio/fetch - Query / Pull images from Remidio Camera API for patient
router.get("/integrations/remidio/fetch", requireAuth(), async (req, res) => {
  const visitId = (req.query.visitId as string || "").trim();
  const phone = (req.query.phone as string || "").trim();

  try {
    // 1. Search for existing patient record matching visitId or phone
    const conditions = [];
    if (visitId) conditions.push(eq(patientsTable.uniqueId, visitId));
    if (phone) conditions.push(eq(patientsTable.phone, phone));

    let patientRecord = null;
    if (conditions.length > 0) {
      const [record] = await db.select().from(patientsTable).where(or(...conditions)).limit(1);
      patientRecord = record || null;
    }

    // Mock/Simulated Remidio Camera Fundus Image payload structure
    // In live production, this queries the Remidio Medios REST API or local Remidio camera hotspot
    const mockFundusCapture = {
      deviceSerial: "REM-FOP-8821-SHM",
      deviceModel: "Remidio Non-Mydriatic Fundus Camera (FOP v3)",
      captureTimestamp: new Date().toISOString(),
      matchedVisitId: patientRecord?.uniqueId || visitId || "SEH/DR/" + new Date().toISOString().slice(0,10).replace(/-/g,'') + "/0001",
      patientName: patientRecord?.name || "Screened Patient",
      images: [
        {
          eye: "OD",
          label: "Right Eye (Oculus Dexter)",
          imageUrl: "/assets/sample_fundus_od.jpg",
          quality: "Good",
          remidioAiGrade: patientRecord?.drStatus || "No DR",
        },
        {
          eye: "OS",
          label: "Left Eye (Oculus Sinister)",
          imageUrl: "/assets/sample_fundus_os.jpg",
          quality: "Good",
          remidioAiGrade: patientRecord?.drStatus || "No DR",
        }
      ]
    };

    res.json({
      status: "success",
      source: remidioConfig.mode,
      data: mockFundusCapture,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to pull images from Remidio Camera: " + err.message });
  }
});

// POST /api/integrations/remidio/webhook - Incoming webhook trigger from Remidio Medios Cloud
router.post("/integrations/remidio/webhook", async (req, res) => {
  const { event, patientId, phone, images, aiDiagnosis, deviceSerial } = req.body;

  console.log(`[Remidio Webhook Received] Event: ${event}, Device: ${deviceSerial}`);

  try {
    if (patientId || phone) {
      const conditions = [];
      if (patientId) conditions.push(eq(patientsTable.uniqueId, patientId));
      if (phone) conditions.push(eq(patientsTable.phone, phone));

      const [patient] = await db.select().from(patientsTable).where(or(...conditions)).limit(1);
      if (patient && images && images.length > 0) {
        // Update patient record with fundus image path from Remidio
        await db.update(patientsTable)
          .set({
            imagePath: images[0].url || images[0],
            drStatus: aiDiagnosis || patient.drStatus,
            updatedAt: new Date(),
          })
          .where(eq(patientsTable.id, patient.id));
      }
    }

    res.json({ status: "acknowledged", timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: "Webhook processing error: " + err.message });
  }
});

export default router;
