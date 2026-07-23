import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, visionCentersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// Helper to extract latitude and longitude from Google Maps URL or query
function parseCoordinates(mapsUrl: string): { latitude?: string; longitude?: string } {
  if (!mapsUrl) return {};

  const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const atMatch = mapsUrl.match(atRegex);
  if (atMatch) {
    return { latitude: atMatch[1], longitude: atMatch[2] };
  }

  const placeRegex = /place\/(-?\d+\.\d+),(-?\d+\.\d+)/;
  const placeMatch = mapsUrl.match(placeRegex);
  if (placeMatch) {
    return { latitude: placeMatch[1], longitude: placeMatch[2] };
  }

  const queryRegex = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;
  const queryMatch = mapsUrl.match(queryRegex);
  if (queryMatch) {
    return { latitude: queryMatch[1], longitude: queryMatch[2] };
  }

  const floatRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
  const floatMatch = mapsUrl.match(floatRegex);
  if (floatMatch) {
    return { latitude: floatMatch[1], longitude: floatMatch[2] };
  }

  return {};
}

// GET /api/vision-centers
router.get("/vision-centers", requireAuth(), async (req, res) => {
  try {
    const { sankaraUnit, state, district } = req.query;
    let query = db.select().from(visionCentersTable);

    const conditions = [];
    if (typeof sankaraUnit === "string" && sankaraUnit) {
      conditions.push(eq(visionCentersTable.sankaraUnit, sankaraUnit));
    }
    if (typeof state === "string" && state) {
      conditions.push(eq(visionCentersTable.state, state));
    }
    if (typeof district === "string" && district) {
      conditions.push(eq(visionCentersTable.district, district));
    }

    const centers = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    res.json(centers);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch vision centers: " + err.message });
  }
});

// GET /api/vision-centers/:id
router.get("/vision-centers/:id", requireAuth(), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const [center] = await db.select().from(visionCentersTable).where(eq(visionCentersTable.id, id));
    if (!center) {
      res.status(404).json({ error: "Vision center not found" });
      return;
    }
    res.json(center);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch vision center: " + err.message });
  }
});

// POST /api/vision-centers
router.post("/vision-centers", requireAuth(["admin", "super_admin", "admin_unit", "unit_head"]), async (req, res) => {
  try {
    const {
      name, shortCode, sankaraUnit, state, district, taluk,
      pincode, address, phone, mapsUrl, latitude: rawLat, longitude: rawLng, status
    } = req.body;

    if (!name || !shortCode || !sankaraUnit || !state || !district) {
      res.status(400).json({ error: "Missing mandatory fields (name, shortCode, sankaraUnit, state, district)" });
      return;
    }

    let latitude = rawLat;
    let longitude = rawLng;
    if (mapsUrl && (!latitude || !longitude)) {
      const parsed = parseCoordinates(mapsUrl);
      if (parsed.latitude && parsed.longitude) {
        latitude = parsed.latitude;
        longitude = parsed.longitude;
      }
    }

    const [created] = await db.insert(visionCentersTable).values({
      name,
      shortCode: shortCode.toUpperCase().trim(),
      sankaraUnit,
      state,
      district,
      taluk: taluk || null,
      pincode: pincode || null,
      address: address || null,
      phone: phone || null,
      mapsUrl: mapsUrl || null,
      latitude: latitude || null,
      longitude: longitude || null,
      status: status || "active",
    }).returning();

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create vision center: " + err.message });
  }
});

// PUT /api/vision-centers/:id
router.put("/vision-centers/:id", requireAuth(["admin", "super_admin", "admin_unit", "unit_head"]), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    const {
      name, sankaraUnit, state, district, taluk,
      pincode, address, phone, mapsUrl, latitude: rawLat, longitude: rawLng, status
    } = req.body;

    let latitude = rawLat;
    let longitude = rawLng;
    if (mapsUrl && (!latitude || !longitude)) {
      const parsed = parseCoordinates(mapsUrl);
      if (parsed.latitude && parsed.longitude) {
        latitude = parsed.latitude;
        longitude = parsed.longitude;
      }
    }

    const [updated] = await db.update(visionCentersTable)
      .set({
        name,
        sankaraUnit,
        state,
        district,
        taluk: taluk || null,
        pincode: pincode || null,
        address: address || null,
        phone: phone || null,
        mapsUrl: mapsUrl || null,
        latitude: latitude || null,
        longitude: longitude || null,
        status: status || "active",
      })
      .where(eq(visionCentersTable.id, id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update vision center: " + err.message });
  }
});

// DELETE /api/vision-centers/:id
router.delete("/vision-centers/:id", requireAuth(["admin", "super_admin", "admin_unit", "unit_head"]), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    await db.delete(visionCentersTable).where(eq(visionCentersTable.id, id));
    res.json({ message: "Vision center deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete vision center: " + err.message });
  }
});

export default router;
