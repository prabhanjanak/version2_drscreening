import { Router } from "express";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
import { db, patientsTable, screeningPlacesTable } from "@workspace/db";
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
  const dateStr = (req.query.date as string || "").trim(); // YYYY-MM-DD

  if (!placeCode || !dateStr) {
    res.status(400).json({ error: "placeCode and date query params are required" });
    return;
  }

  try {
    // Find global maximum serial number across ALL camps and dates
    const [result] = await db
      .select({ maxSerial: sql<number>`COALESCE(MAX(${patientsTable.serialNumber}), 0)` })
      .from(patientsTable);

    const nextSerial = (result?.maxSerial || 0) + 1;
    const serialStr = nextSerial.toString().padStart(4, "0");
    const parts = dateStr.split("-");
    const dateFormatted = parts.length === 3 ? `${parts[2]}${parts[1]}${parts[0]}` : dateStr.replace(/-/g, "");
    const uniqueId = `SEH/${placeCode}/${dateFormatted}/${serialStr}`;

    res.json({ nextSerial, uniqueId });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate next serial: " + err.message });
  }
});

// GET /api/patients - Get patients list (with pagination, filters, and search)
router.get("/patients", requireAuth(), async (req, res) => {
  try {
    const { date, place, name, phone, status, advice, uniqueId, referralStatus } = req.query as Record<string, string>;

    const conditions = [];

    if (date) conditions.push(eq(patientsTable.date, date));
    if (place) conditions.push(eq(patientsTable.screeningPlaceCode, place.toUpperCase()));
    if (name) conditions.push(ilike(patientsTable.name, `%${name}%`));
    if (phone) conditions.push(ilike(patientsTable.phone, `%${phone}%`));
    if (status) conditions.push(eq(patientsTable.drStatus, status));
    if (advice) conditions.push(eq(patientsTable.advice, advice));
    if (uniqueId) conditions.push(ilike(patientsTable.uniqueId, `%${uniqueId}%`));
    if (referralStatus) conditions.push(eq(patientsTable.referralStatus, referralStatus));

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
    diabetesDuration,
    bloodPressure,
    drStatus,
    advice,
    imagePath,
    imageQuality,
    latitude,
    longitude,
    referralStatus,
    referToBaseHospital,
    baseHospitalRemarks,
    remarks,
  } = req.body;

  if (!date || !screeningPlaceCode || !name || !age || !gender || !phone) {
    res.status(400).json({ error: "Missing required fields. Date, Screening Place, Name, Age, Gender, and Phone are required." });
    return;
  }

  try {
    // Check if phone number already has previous records (warning condition check)
    const phoneRecords = await db
      .select({ id: patientsTable.id })
      .from(patientsTable)
      .where(eq(patientsTable.phone, phone.trim()));

    const phoneWarning = phoneRecords.length > 0 ? `Warning: Patient with phone number ${phone} was screened ${phoneRecords.length} times previously.` : null;

    // Find global maximum serial number across ALL camps and dates
    const [globalMax] = await db
      .select({ maxSerial: sql<number>`COALESCE(MAX(${patientsTable.serialNumber}), 0)` })
      .from(patientsTable);

    const [placeDetails] = await db
      .select({ latitude: screeningPlacesTable.latitude, longitude: screeningPlacesTable.longitude })
      .from(screeningPlacesTable)
      .where(eq(screeningPlacesTable.shortCode, screeningPlaceCode.toUpperCase()));

    let nextSerial = (globalMax?.maxSerial || 0) + 1;
    let serialStr = nextSerial.toString().padStart(4, "0");
    const dateParts = date.split("-");
    const dateFormatted = dateParts.length === 3 ? `${dateParts[2]}${dateParts[1]}${dateParts[0]}` : date.replace(/-/g, "");
    const cleanPlaceCode = screeningPlaceCode.toUpperCase().trim();
    let generatedUniqueId = `SEH/${cleanPlaceCode}/${dateFormatted}/${serialStr}`;

    // Ensure no collisions by finding first available global unique ID
    while (true) {
      const [existing] = await db
        .select({ id: patientsTable.id })
        .from(patientsTable)
        .where(eq(patientsTable.uniqueId, generatedUniqueId));
      if (!existing) break;
      nextSerial += 1;
      serialStr = nextSerial.toString().padStart(4, "0");
      generatedUniqueId = `SEH/${cleanPlaceCode}/${dateFormatted}/${serialStr}`;
    }

    const uniqueId = generatedUniqueId;

    const [patient] = await db
      .insert(patientsTable)
      .values({
        uniqueId,
        date,
        screeningPlaceCode: screeningPlaceCode.toUpperCase(),
        serialNumber: nextSerial,
        name: name.trim(),
        age: parseInt(age, 10),
        gender,
        address: address ? address.trim() : null,
        phone: phone.trim(),
        diabetesDuration: diabetesDuration || "Newly Diagnosed",
        bloodPressure: bloodPressure || null,
        drStatus: drStatus || "No DR",
        advice: advice || "Hospital Upload Pending",
        imagePath: imagePath || "Pending Hospital Upload",
        imageQuality: imageQuality || "Good",
        latitude: placeDetails?.latitude || null,
        longitude: placeDetails?.longitude || null,
        referralStatus: referralStatus || "Referred",
        referToBaseHospital: !!referToBaseHospital,
        baseHospitalRemarks: baseHospitalRemarks ? baseHospitalRemarks.trim() : null,
        remarks: remarks ? remarks.trim() : null,
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
    diabetesDuration,
    bloodPressure,
    drStatus,
    advice,
    imagePath,
    imageQuality,
    referralStatus,
    referToBaseHospital,
    baseHospitalRemarks,
    remarks,
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
        age: age ? parseInt(age, 10) : existing.age,
        gender: gender || existing.gender,
        address: address !== undefined ? address : existing.address,
        phone: phone ? phone.trim() : existing.phone,
        diabetesDuration: diabetesDuration || existing.diabetesDuration,
        bloodPressure: bloodPressure !== undefined ? bloodPressure : existing.bloodPressure,
        drStatus: drStatus || existing.drStatus,
        advice: advice || existing.advice,
        imagePath: imagePath || existing.imagePath,
        imageQuality: imageQuality || existing.imageQuality,
        referralStatus: referralStatus || existing.referralStatus,
        referToBaseHospital: referToBaseHospital !== undefined ? !!referToBaseHospital : existing.referToBaseHospital,
        baseHospitalRemarks: baseHospitalRemarks !== undefined ? baseHospitalRemarks : existing.baseHospitalRemarks,
        remarks: remarks !== undefined ? remarks : existing.remarks,
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

// GET /api/patients/export - CSV Export route
router.get("/patients-export", requireAuth(["admin", "super_admin", "doctor"]), async (req, res) => {
  try {
    const { date, place, status, advice, gender } = req.query as Record<string, string>;

    const conditions = [];
    if (date) conditions.push(eq(patientsTable.date, date));
    if (place) conditions.push(eq(patientsTable.screeningPlaceCode, place.toUpperCase()));
    if (status) conditions.push(eq(patientsTable.drStatus, status));
    if (advice) conditions.push(eq(patientsTable.advice, advice));
    if (gender) conditions.push(eq(patientsTable.gender, gender));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select()
      .from(patientsTable)
      .where(whereClause)
      .orderBy(desc(patientsTable.createdAt));

    // Convert list to CSV format
    const headers = [
      "Date",
      "Unique ID",
      "Name",
      "Age",
      "Gender",
      "Phone",
      "Address",
      "Place Code",
      "Diabetes Duration",
      "DR Status",
      "Advice",
      "Referral Status",
      "Image Quality",
      "Image Path",
      "GPS Latitude",
      "GPS Longitude"
    ];

    const rows = list.map(p => [
      p.date,
      p.uniqueId,
      `"${p.name.replace(/"/g, '""')}"`,
      p.age,
      p.gender,
      p.phone,
      `"${(p.address || "").replace(/"/g, '""')}"`,
      p.screeningPlaceCode,
      p.diabetesDuration,
      p.drStatus,
      p.advice,
      p.referralStatus,
      p.imageQuality,
      p.imagePath,
      p.latitude || "",
      p.longitude || ""
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="DRSMS_Export_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to export patients: " + err.message });
  }
});

export default router;
