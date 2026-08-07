import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, screeningPlacesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/screening-places - Get all screening places
router.get("/screening-places", async (_req, res) => {
  try {
    const places = await db.select().from(screeningPlacesTable).orderBy(screeningPlacesTable.name);
    res.json(places);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch screening places: " + err.message });
  }
});

// POST /api/screening-places - Create a new screening place
router.post("/screening-places", requireAuth(["admin", "super_admin", "admin_unit", "outreach"]), async (req, res) => {
  const { name, shortCode, district, state, status, latitude, longitude, taluk, pincode, campDate, mapLink, sankaraUnit } = req.body;
  if (!name || !shortCode || !district || !state) {
    res.status(400).json({ error: "Missing required fields (name, shortCode, district, state)" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(screeningPlacesTable)
      .where(eq(screeningPlacesTable.shortCode, shortCode.toUpperCase().trim()));

    if (existing) {
      res.status(400).json({ error: "Short code already exists" });
      return;
    }

    const [place] = await db
      .insert(screeningPlacesTable)
      .values({
        name: name.trim(),
        shortCode: shortCode.toUpperCase().trim(),
        district: district.trim(),
        state: state.trim(),
        status: status || "active",
        latitude: latitude || null,
        longitude: longitude || null,
        taluk: taluk || null,
        pincode: pincode || null,
        campDate: campDate || null,
        mapLink: mapLink || null,
        sankaraUnit: sankaraUnit || null,
      })
      .returning();

    res.status(201).json(place);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create screening place: " + err.message });
  }
});

// PUT /api/screening-places/:id - Update screening place
router.put("/screening-places/:id", requireAuth(["admin", "super_admin", "admin_unit", "outreach"]), async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid place ID" });
    return;
  }

  const { name, district, state, status, latitude, longitude, taluk, pincode, campDate, mapLink, sankaraUnit } = req.body;
  try {
    const [existing] = await db
      .select()
      .from(screeningPlacesTable)
      .where(eq(screeningPlacesTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Screening place not found" });
      return;
    }

    const [updated] = await db
      .update(screeningPlacesTable)
      .set({
        name: name ? name.trim() : existing.name,
        district: district ? district.trim() : existing.district,
        state: state ? state.trim() : existing.state,
        status: status || existing.status,
        latitude: latitude !== undefined ? latitude : existing.latitude,
        longitude: longitude !== undefined ? longitude : existing.longitude,
        taluk: taluk !== undefined ? taluk : existing.taluk,
        pincode: pincode !== undefined ? pincode : existing.pincode,
        campDate: campDate !== undefined ? campDate : existing.campDate,
        mapLink: mapLink !== undefined ? mapLink : existing.mapLink,
        sankaraUnit: sankaraUnit !== undefined ? sankaraUnit : existing.sankaraUnit,
      })
      .where(eq(screeningPlacesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update screening place: " + err.message });
  }
});

// DELETE /api/screening-places/:id - Delete screening place (Admin/Super Admin only)
router.delete("/screening-places/:id", requireAuth(["admin", "super_admin", "admin_unit"]), async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid place ID" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(screeningPlacesTable)
      .where(eq(screeningPlacesTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Screening place not found" });
      return;
    }

    res.json({ message: "Screening place deleted successfully", place: deleted });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete screening place: " + err.message });
  }
});

export default router;
