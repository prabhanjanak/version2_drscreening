import { Router } from "express";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
import { db, patientsTable, screeningPlacesTable, systemUsersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Multer Setup for Fundus Image Upload
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .slice(0, 50);
    cb(null, `fundus_${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Max 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      cb(new Error("Only JPG, JPEG, PNG, and WEBP image formats are allowed"));
      return;
    }
    cb(null, true);
  },
});

// Image upload route
router.post("/patients/upload-image", requireAuth(), upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file provided" });
    return;
  }
  const imagePath = `/api/uploads/${req.file.filename}`;
  res.json({ imagePath });
});

// GET /api/patients/next-serial - Retrieve next serial number & unique id format (Continuous Global Counter)
router.get("/patients/next-serial", requireAuth(), async (req, res) => {
  const placeCode = (req.query.placeCode as string || "").toUpperCase().trim();
  const dateStr = (req.query.date as string || "").trim(); // YYYY-MM-DD fallback

  if (!placeCode) {
    res.status(400).json({ error: "placeCode query param is required" });
    return;
  }

  try {
    // Look up camp to get its official camp creation date / camp date
    const [place] = await db
      .select({
        campDate: screeningPlacesTable.campDate,
        createdAt: screeningPlacesTable.createdAt,
      })
      .from(screeningPlacesTable)
      .where(eq(screeningPlacesTable.shortCode, placeCode));

    let effectiveDate = "";
    if (place) {
      if (place.campDate && place.campDate.trim()) {
        effectiveDate = place.campDate.trim();
      } else if (place.createdAt) {
        effectiveDate = new Date(place.createdAt).toISOString().split("T")[0];
      }
    }
    if (!effectiveDate) {
      effectiveDate = dateStr || new Date().toISOString().split("T")[0];
    }

    // Find global maximum serial number across ALL camps and dates
    const [result] = await db
      .select({ maxSerial: sql<number>`COALESCE(MAX(${patientsTable.serialNumber}), 0)` })
      .from(patientsTable);

    const nextSerial = (result?.maxSerial || 0) + 1;
    const serialStr = nextSerial.toString().padStart(4, "0");
    const parts = effectiveDate.split("-");
    const dateFormatted = parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0]}` : effectiveDate.replace(/-/g, "");
    const uniqueId = `SEH/${placeCode}/${dateFormatted}/${serialStr}`;

    res.json({ nextSerial, uniqueId, campDate: effectiveDate });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate next serial: " + err.message });
  }
});

// GET /api/patients - Get patients list (with pagination, filters, and search)
router.get("/patients", requireAuth(), async (req, res) => {
  try {
    const { 
      date, place, name, phone, status, advice, uniqueId, referralStatus,
      hasCataract, visitedBaseHospital, referredToGiftOfVision, referralSource, search 
    } = req.query as Record<string, string>;

    const conditions = [];

    if (date && date.trim()) conditions.push(ilike(patientsTable.date, `%${date.trim()}%`));
    if (place && place.trim()) conditions.push(ilike(patientsTable.screeningPlaceCode, `%${place.trim()}%`));
    if (name && name.trim()) conditions.push(ilike(patientsTable.name, `%${name.trim()}%`));
    if (phone && phone.trim()) conditions.push(ilike(patientsTable.phone, `%${phone.trim()}%`));
    if (status && status.trim()) conditions.push(ilike(patientsTable.drStatus, `%${status.trim()}%`));
    if (advice && advice.trim()) conditions.push(ilike(patientsTable.advice, `%${advice.trim()}%`));
    if (uniqueId && uniqueId.trim()) conditions.push(ilike(patientsTable.uniqueId, `%${uniqueId.trim()}%`));
    if (referralStatus && referralStatus.trim()) conditions.push(ilike(patientsTable.referralStatus, `%${referralStatus.trim()}%`));
    if (hasCataract && hasCataract.trim()) conditions.push(ilike(patientsTable.hasCataract, `%${hasCataract.trim()}%`));
    if (referralSource && referralSource.trim()) conditions.push(ilike(patientsTable.referralSource, `%${referralSource.trim()}%`));
    if (visitedBaseHospital !== undefined && visitedBaseHospital !== "") {
      conditions.push(eq(patientsTable.visitedBaseHospital, visitedBaseHospital === "true"));
    }
    if (referredToGiftOfVision !== undefined && referredToGiftOfVision !== "") {
      conditions.push(eq(patientsTable.referredToGiftOfVision, referredToGiftOfVision === "true"));
    }
    if (search && search.trim()) {
      conditions.push(
        or(
          ilike(patientsTable.name, `%${search.trim()}%`),
          ilike(patientsTable.uniqueId, `%${search.trim()}%`),
          ilike(patientsTable.phone, `%${search.trim()}%`),
          ilike(patientsTable.alternatePhone, `%${search.trim()}%`),
          ilike(patientsTable.address, `%${search.trim()}%`),
          ilike(patientsTable.advice, `%${search.trim()}%`),
          ilike(patientsTable.remarks, `%${search.trim()}%`),
          ilike(patientsTable.baseHospitalRemarks, `%${search.trim()}%`),
          ilike(patientsTable.referralSource, `%${search.trim()}%`),
          ilike(patientsTable.govtSchemes, `%${search.trim()}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select()
      .from(patientsTable)
      .where(whereClause)
      .orderBy(desc(patientsTable.createdAt));

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list patients: " + err.message });
  }
});

// GET /api/patients/:id - Get single patient
router.get("/patients/:id", requireAuth(), async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid patient ID" });
    return;
  }

  try {
    const [patient] = await db
      .select()
      .from(patientsTable)
      .where(eq(patientsTable.id, id));

    if (!patient) {
      res.status(404).json({ error: "Patient record not found" });
      return;
    }

    res.json(patient);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch patient details: " + err.message });
  }
});

// POST /api/patients - Register a new patient screening
router.post("/patients", requireAuth(), async (req, res) => {
  const {
    date,
    screeningPlaceCode,
    name,
    age,
    gender,
    address,
    phone,
    alternatePhone,
    referralSource,
    diabetesDuration,
    diabetesMeasureType,
    diabetesMeasureValue,
    grbsRecordedBy,
    chcPhcCenterName,
    bloodPressure,
    drStatus,
    hasCataract,
    cataractPlanning,
    fundusCaptured,
    fundusNotCapturedReason,
    advice,
    imagePath,
    imageQuality,
    latitude,
    longitude,
    referralStatus,
    referToBaseHospital,
    baseHospitalRemarks,
    remarks,
    referredToGiftOfVision,
    giftOfVisionNotes,
    govtSchemes,
    visitedBaseHospital,
    baseHospitalVisitDate,
    baseHospitalOutcome,
    baseHospitalOutcomeNotes,
  } = req.body;

  if (!screeningPlaceCode || !name || !age || !gender || !phone) {
    res.status(400).json({ error: "Missing required fields. Screening Place, Name, Age, Gender, and Phone are required." });
    return;
  }

  try {
    const cleanPlaceCode = screeningPlaceCode.toUpperCase().trim();

    // Check if phone number already has previous records (warning condition check)
    const phoneRecords = await db
      .select({ id: patientsTable.id })
      .from(patientsTable)
      .where(eq(patientsTable.phone, phone.trim()));

    const phoneWarning = phoneRecords.length > 0 ? `Warning: Patient with phone number ${phone} was screened ${phoneRecords.length} times previously.` : null;

    // 1. Fetch camp details to get coordinates AND the official camp creation date / camp date
    const [placeDetails] = await db
      .select({
        latitude: screeningPlacesTable.latitude,
        longitude: screeningPlacesTable.longitude,
        campDate: screeningPlacesTable.campDate,
        createdAt: screeningPlacesTable.createdAt,
      })
      .from(screeningPlacesTable)
      .where(eq(screeningPlacesTable.shortCode, cleanPlaceCode));

    // Determine the official date for this patient record from the camp creation / camp date
    let patientDate = "";
    if (placeDetails) {
      if (placeDetails.campDate && placeDetails.campDate.trim()) {
        patientDate = placeDetails.campDate.trim();
      } else if (placeDetails.createdAt) {
        patientDate = new Date(placeDetails.createdAt).toISOString().split("T")[0];
      }
    }
    // Fallback if camp has no date info
    if (!patientDate) {
      patientDate = (date && typeof date === "string" && date.trim()) ? date.trim() : new Date().toISOString().split("T")[0];
    }

    // 2. Global continuous serial number
    const [globalMax] = await db
      .select({ maxSerial: sql<number>`COALESCE(MAX(${patientsTable.serialNumber}), 0)` })
      .from(patientsTable);

    const nextSerial = (globalMax?.maxSerial || 0) + 1;
    const serialStr = nextSerial.toString().padStart(4, "0");
    const dateParts = patientDate.split("-");
    const dateFormatted = dateParts.length === 3 ? `${dateParts[2]}${dateParts[1]}${dateParts[0]}` : patientDate.replace(/-/g, "");
    const uniqueId = `SEH/${cleanPlaceCode}/${dateFormatted}/${serialStr}`;

    const [patient] = await db
      .insert(patientsTable)
      .values({
        uniqueId,
        date: patientDate,
        screeningPlaceCode: cleanPlaceCode,
        serialNumber: nextSerial,
        name: name.trim(),
        age: parseInt(String(age), 10),
        gender,
        address: address ? address.trim() : null,
        phone: phone.trim(),
        alternatePhone: alternatePhone ? alternatePhone.trim() : null,
        referralSource: referralSource ? referralSource.trim() : "Camp Walk-in / General",
        diabetesDuration: diabetesDuration || "Newly Diagnosed",
        diabetesMeasureType: diabetesMeasureType || "GRBS (mg/dL)",
        diabetesMeasureValue: diabetesMeasureValue ? String(diabetesMeasureValue).trim() : null,
        grbsRecordedBy: grbsRecordedBy ? grbsRecordedBy.trim() : "CHC Staff",
        chcPhcCenterName: chcPhcCenterName ? chcPhcCenterName.trim() : null,
        bloodPressure: bloodPressure ? bloodPressure.trim() : null,
        drStatus: drStatus || "No DR",
        hasCataract: hasCataract || "None",
        cataractPlanning: cataractPlanning ? cataractPlanning.trim() : null,
        fundusCaptured: fundusCaptured !== undefined ? !!fundusCaptured : true,
        fundusNotCapturedReason: fundusNotCapturedReason ? fundusNotCapturedReason.trim() : null,
        advice: advice || "Annual Review",
        imagePath: imagePath || "/uploads/no_fundus_photo.png",
        imageQuality: imageQuality || "Good",
        latitude: latitude || placeDetails?.latitude || null,
        longitude: longitude || placeDetails?.longitude || null,
        referralStatus: referralStatus || "Referred",
        referToBaseHospital: !!referToBaseHospital,
        baseHospitalRemarks: baseHospitalRemarks ? baseHospitalRemarks.trim() : null,
        remarks: remarks ? remarks.trim() : null,
        referredToGiftOfVision: !!referredToGiftOfVision,
        giftOfVisionNotes: giftOfVisionNotes ? giftOfVisionNotes.trim() : null,
        govtSchemes: govtSchemes ? (Array.isArray(govtSchemes) ? govtSchemes.join(", ") : govtSchemes) : null,
        visitedBaseHospital: !!visitedBaseHospital,
        baseHospitalVisitDate: baseHospitalVisitDate ? baseHospitalVisitDate.trim() : null,
        baseHospitalOutcome: baseHospitalOutcome ? baseHospitalOutcome.trim() : null,
        baseHospitalOutcomeNotes: baseHospitalOutcomeNotes ? baseHospitalOutcomeNotes.trim() : null,
        createdBy: req.user!.id,
      })
      .returning();

    res.status(201).json({
      message: "Patient screening entry created successfully",
      patient,
      phoneWarning,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to register patient: " + err.message });
  }
});

// PUT /api/patients/:id - Update patient screening record
router.put("/patients/:id", requireAuth(), async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid patient ID" });
    return;
  }

  const {
    name,
    age,
    gender,
    address,
    phone,
    alternatePhone,
    referralSource,
    diabetesDuration,
    diabetesMeasureType,
    diabetesMeasureValue,
    grbsRecordedBy,
    chcPhcCenterName,
    bloodPressure,
    drStatus,
    hasCataract,
    cataractPlanning,
    fundusCaptured,
    fundusNotCapturedReason,
    advice,
    imagePath,
    imageQuality,
    referralStatus,
    referToBaseHospital,
    baseHospitalRemarks,
    remarks,
    referredToGiftOfVision,
    giftOfVisionNotes,
    govtSchemes,
    visitedBaseHospital,
    baseHospitalVisitDate,
    baseHospitalOutcome,
    baseHospitalOutcomeNotes,
    latitude,
    longitude,
  } = req.body;

  try {
    const [existing] = await db.select().from(patientsTable).where(eq(patientsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Patient record not found" });
      return;
    }

    const [updated] = await db
      .update(patientsTable)
      .set({
        name: name ? name.trim() : existing.name,
        age: age ? parseInt(String(age), 10) : existing.age,
        gender: gender || existing.gender,
        address: address !== undefined ? address : existing.address,
        phone: phone ? phone.trim() : existing.phone,
        alternatePhone: alternatePhone !== undefined ? alternatePhone : existing.alternatePhone,
        referralSource: referralSource !== undefined ? referralSource : existing.referralSource,
        diabetesDuration: diabetesDuration || existing.diabetesDuration,
        diabetesMeasureType: diabetesMeasureType !== undefined ? diabetesMeasureType : existing.diabetesMeasureType,
        diabetesMeasureValue: diabetesMeasureValue !== undefined ? diabetesMeasureValue : existing.diabetesMeasureValue,
        grbsRecordedBy: grbsRecordedBy !== undefined ? grbsRecordedBy : existing.grbsRecordedBy,
        chcPhcCenterName: chcPhcCenterName !== undefined ? chcPhcCenterName : existing.chcPhcCenterName,
        bloodPressure: bloodPressure !== undefined ? bloodPressure : existing.bloodPressure,
        drStatus: drStatus || existing.drStatus,
        hasCataract: hasCataract !== undefined ? hasCataract : existing.hasCataract,
        cataractPlanning: cataractPlanning !== undefined ? cataractPlanning : existing.cataractPlanning,
        fundusCaptured: fundusCaptured !== undefined ? !!fundusCaptured : existing.fundusCaptured,
        fundusNotCapturedReason: fundusNotCapturedReason !== undefined ? fundusNotCapturedReason : existing.fundusNotCapturedReason,
        advice: advice || existing.advice,
        imagePath: imagePath || existing.imagePath,
        imageQuality: imageQuality || existing.imageQuality,
        referralStatus: referralStatus || existing.referralStatus,
        referToBaseHospital: referToBaseHospital !== undefined ? !!referToBaseHospital : existing.referToBaseHospital,
        baseHospitalRemarks: baseHospitalRemarks !== undefined ? baseHospitalRemarks : existing.baseHospitalRemarks,
        remarks: remarks !== undefined ? remarks : existing.remarks,
        referredToGiftOfVision: referredToGiftOfVision !== undefined ? !!referredToGiftOfVision : existing.referredToGiftOfVision,
        giftOfVisionNotes: giftOfVisionNotes !== undefined ? giftOfVisionNotes : existing.giftOfVisionNotes,
        govtSchemes: govtSchemes !== undefined ? (Array.isArray(govtSchemes) ? govtSchemes.join(", ") : govtSchemes) : existing.govtSchemes,
        visitedBaseHospital: visitedBaseHospital !== undefined ? !!visitedBaseHospital : existing.visitedBaseHospital,
        baseHospitalVisitDate: baseHospitalVisitDate !== undefined ? baseHospitalVisitDate : existing.baseHospitalVisitDate,
        baseHospitalOutcome: baseHospitalOutcome !== undefined ? baseHospitalOutcome : existing.baseHospitalOutcome,
        baseHospitalOutcomeNotes: baseHospitalOutcomeNotes !== undefined ? baseHospitalOutcomeNotes : existing.baseHospitalOutcomeNotes,
        latitude: latitude || existing.latitude,
        longitude: longitude || existing.longitude,
      })
      .where(eq(patientsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update patient: " + err.message });
  }
});

// PATCH /api/patients/:id/base-hospital-visit - Record visit & outcome at Base Hospital
router.patch("/patients/:id/base-hospital-visit", requireAuth(), async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid patient ID" });
    return;
  }

  const { visitedBaseHospital, baseHospitalVisitDate, baseHospitalOutcome, baseHospitalOutcomeNotes } = req.body;

  try {
    const today = new Date().toISOString().split("T")[0];
    const [updated] = await db
      .update(patientsTable)
      .set({
        visitedBaseHospital: visitedBaseHospital !== undefined ? !!visitedBaseHospital : true,
        baseHospitalVisitDate: baseHospitalVisitDate || today,
        baseHospitalOutcome: baseHospitalOutcome || "Evaluation Done",
        baseHospitalOutcomeNotes: baseHospitalOutcomeNotes ? baseHospitalOutcomeNotes.trim() : null,
        referralStatus: "Visited",
      })
      .where(eq(patientsTable.id, id))
      .returning();

    res.json({ message: "Base hospital visit outcome recorded successfully", patient: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to record base hospital visit: " + err.message });
  }
});

// POST /api/patients/:id/upload-fundus - Upload / sync Remidio retinal photo directly at Base Hospital
router.post("/patients/:id/upload-fundus", requireAuth(), upload.single("image"), async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid patient ID" });
    return;
  }

  try {
    let remoteImagePath = "";
    if (req.file) {
      remoteImagePath = `/uploads/${req.file.filename}`;
    } else if (req.body.imagePath) {
      remoteImagePath = req.body.imagePath;
    } else {
      res.status(400).json({ error: "No image file or imagePath provided" });
      return;
    }

    const [updated] = await db
      .update(patientsTable)
      .set({
        imagePath: remoteImagePath,
        fundusCaptured: true,
        imageQuality: req.body.imageQuality || "Good",
      })
      .where(eq(patientsTable.id, id))
      .returning();

    res.json({ message: "Remidio fundus image uploaded and synced successfully", patient: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to upload fundus image: " + err.message });
  }
});

// DELETE /api/patients/:id - Delete screening entry (Admin/Super Admin only)
router.delete("/patients/:id", requireAuth(["admin", "super_admin", "admin_unit"]), async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid patient ID" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(patientsTable)
      .where(eq(patientsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Patient record not found" });
      return;
    }

    res.json({ message: "Patient record deleted successfully", patient: deleted });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete patient: " + err.message });
  }
});

// GET /api/patients-export - CSV / Excel Export route with all typed advice and remarks
router.get("/patients-export", requireAuth(), async (req, res) => {
  try {
    const { date, place, status, advice, gender, search } = req.query as Record<string, string>;

    const conditions = [];
    if (date && date.trim()) conditions.push(ilike(patientsTable.date, `%${date.trim()}%`));
    if (place && place.trim()) conditions.push(ilike(patientsTable.screeningPlaceCode, `%${place.trim()}%`));
    if (status && status.trim()) conditions.push(ilike(patientsTable.drStatus, `%${status.trim()}%`));
    if (advice && advice.trim()) conditions.push(ilike(patientsTable.advice, `%${advice.trim()}%`));
    if (gender && gender.trim()) conditions.push(ilike(patientsTable.gender, `%${gender.trim()}%`));
    if (search && search.trim()) {
      conditions.push(
        or(
          ilike(patientsTable.name, `%${search.trim()}%`),
          ilike(patientsTable.uniqueId, `%${search.trim()}%`),
          ilike(patientsTable.phone, `%${search.trim()}%`),
          ilike(patientsTable.address, `%${search.trim()}%`),
          ilike(patientsTable.advice, `%${search.trim()}%`),
          ilike(patientsTable.remarks, `%${search.trim()}%`),
          ilike(patientsTable.baseHospitalRemarks, `%${search.trim()}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: patientsTable.id,
        uniqueId: patientsTable.uniqueId,
        date: patientsTable.date,
        screeningPlaceCode: patientsTable.screeningPlaceCode,
        campName: screeningPlacesTable.name,
        serialNumber: patientsTable.serialNumber,
        name: patientsTable.name,
        age: patientsTable.age,
        gender: patientsTable.gender,
        address: patientsTable.address,
        phone: patientsTable.phone,
        alternatePhone: patientsTable.alternatePhone,
        referralSource: patientsTable.referralSource,
        diabetesDuration: patientsTable.diabetesDuration,
        diabetesMeasureType: patientsTable.diabetesMeasureType,
        diabetesMeasureValue: patientsTable.diabetesMeasureValue,
        grbsRecordedBy: patientsTable.grbsRecordedBy,
        chcPhcCenterName: patientsTable.chcPhcCenterName,
        bloodPressure: patientsTable.bloodPressure,
        drStatus: patientsTable.drStatus,
        hasCataract: patientsTable.hasCataract,
        cataractPlanning: patientsTable.cataractPlanning,
        fundusCaptured: patientsTable.fundusCaptured,
        fundusNotCapturedReason: patientsTable.fundusNotCapturedReason,
        advice: patientsTable.advice,
        referToBaseHospital: patientsTable.referToBaseHospital,
        baseHospitalRemarks: patientsTable.baseHospitalRemarks,
        remarks: patientsTable.remarks,
        referredToGiftOfVision: patientsTable.referredToGiftOfVision,
        giftOfVisionNotes: patientsTable.giftOfVisionNotes,
        govtSchemes: patientsTable.govtSchemes,
        visitedBaseHospital: patientsTable.visitedBaseHospital,
        baseHospitalVisitDate: patientsTable.baseHospitalVisitDate,
        baseHospitalOutcome: patientsTable.baseHospitalOutcome,
        baseHospitalOutcomeNotes: patientsTable.baseHospitalOutcomeNotes,
        referralStatus: patientsTable.referralStatus,
        imageQuality: patientsTable.imageQuality,
        imagePath: patientsTable.imagePath,
        latitude: patientsTable.latitude,
        longitude: patientsTable.longitude,
        createdBy: systemUsersTable.name,
        createdAt: patientsTable.createdAt,
      })
      .from(patientsTable)
      .leftJoin(screeningPlacesTable, eq(sql`UPPER(${patientsTable.screeningPlaceCode})`, sql`UPPER(${screeningPlacesTable.shortCode})`))
      .leftJoin(systemUsersTable, eq(patientsTable.createdBy, systemUsersTable.id))
      .where(whereClause)
      .orderBy(desc(patientsTable.date), desc(patientsTable.createdAt));

    // Convert list to clean CSV format with all 12 requested clinical and workflow fields
    const headers = [
      "Camp Date",
      "Unique Patient ID",
      "Patient Full Name",
      "Age (Yrs)",
      "Gender",
      "Mobile Phone",
      "Alternate Phone",
      "Referral / Awareness Source",
      "Address / Village",
      "Camp Code",
      "Camp Name",
      "Diabetes Duration",
      "Glucose Measure Type",
      "Glucose Reading (mg/dL or %)",
      "GRBS Done By (CHC/PHC/Staff)",
      "CHC / PHC Center Name",
      "Blood Pressure (mmHg)",
      "DR Diagnosis / Stage",
      "Cataract Evaluation",
      "Cataract Planning & Camp Action",
      "Fundus Photo Captured (Yes/No)",
      "Reason If Fundus Not Captured",
      "Advice & Action Plan (Typed Details)",
      "Referred to Gift of Vision (Yes/No)",
      "Gift of Vision Sponsorship Notes",
      "Govt Schemes & Health Insurance",
      "Refer to Base Hospital",
      "Base Hospital Referral Remarks",
      "General Clinical Remarks",
      "Visited Base Hospital (Yes/No)",
      "Base Hospital Visit Date",
      "Base Hospital Clinical Outcome",
      "Base Hospital Outcome Notes",
      "Referral Status",
      "Fundus Image Quality",
      "Fundus Image URL",
      "GPS Latitude",
      "GPS Longitude",
      "Recorded By",
      "Created Timestamp"
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = list.map(p => [
      escapeCsv(p.date),
      escapeCsv(p.uniqueId),
      escapeCsv(p.name),
      p.age,
      escapeCsv(p.gender),
      escapeCsv(p.phone),
      escapeCsv(p.alternatePhone || ""),
      escapeCsv(p.referralSource || "Camp Walk-in"),
      escapeCsv(p.address || ""),
      escapeCsv(p.screeningPlaceCode),
      escapeCsv(p.campName || p.screeningPlaceCode),
      escapeCsv(p.diabetesDuration),
      escapeCsv(p.diabetesMeasureType || "GRBS (mg/dL)"),
      escapeCsv(p.diabetesMeasureValue || "N/A"),
      escapeCsv(p.grbsRecordedBy || "CHC Staff"),
      escapeCsv(p.chcPhcCenterName || ""),
      escapeCsv(p.bloodPressure || "N/A"),
      escapeCsv(p.drStatus),
      escapeCsv(p.hasCataract || "None"),
      escapeCsv(p.cataractPlanning || ""),
      escapeCsv(p.fundusCaptured ? "Yes" : "No"),
      escapeCsv(p.fundusNotCapturedReason || ""),
      escapeCsv(p.advice || "N/A"),
      escapeCsv(p.referredToGiftOfVision ? "Yes (Free Sankara Sponsorship)" : "No"),
      escapeCsv(p.giftOfVisionNotes || ""),
      escapeCsv(p.govtSchemes || "None"),
      escapeCsv(p.referToBaseHospital ? "Yes (Referred to Base Hospital)" : "No"),
      escapeCsv(p.baseHospitalRemarks || ""),
      escapeCsv(p.remarks || ""),
      escapeCsv(p.visitedBaseHospital ? "Yes (Visited Base)" : "No"),
      escapeCsv(p.baseHospitalVisitDate || ""),
      escapeCsv(p.baseHospitalOutcome || ""),
      escapeCsv(p.baseHospitalOutcomeNotes || ""),
      escapeCsv(p.referralStatus || "Referred"),
      escapeCsv(p.imageQuality || "Good"),
      escapeCsv(p.imagePath || ""),
      escapeCsv(p.latitude || ""),
      escapeCsv(p.longitude || ""),
      escapeCsv(p.createdBy || "Field Screener"),
      escapeCsv(p.createdAt ? new Date(p.createdAt).toISOString() : "")
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="DRSMS_Clinical_Report_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to export patients: " + err.message });
  }
});

export default router;
