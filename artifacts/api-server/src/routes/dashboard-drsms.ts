import { Router } from "express";
import { eq, and, sql, not, inArray } from "drizzle-orm";
import { db, patientsTable, systemUsersTable, screeningPlacesTable, visionCentersTable, vcReferralsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/dashboard/drsms", requireAuth(["admin", "super_admin", "doctor", "field_user", "admin_unit", "unit_head", "facility_manager", "vision_center", "asha_worker", "ophthalmic_officer", "outreach"]), async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const currentMonth = today.slice(0, 7); // YYYY-MM
    const user = req.user!;
    let placeCodes: string[] | null = null;

    // ──── ACCESS CONTROL SCOPING ────
    if (user.userType === "admin_unit" || user.userType === "unit_head") {
      // Scoped to places within the user's specific Sankara Unit (assignedTrack)
      if (user.assignedTrack) {
        const unitPlaces = await db
          .select({ shortCode: screeningPlacesTable.shortCode })
          .from(screeningPlacesTable)
          .where(eq(screeningPlacesTable.sankaraUnit, user.assignedTrack));
        placeCodes = unitPlaces.map(p => p.shortCode);
      } else {
        placeCodes = [];
      }
    } else if (user.userType === "field_user" || user.userType === "vision_center" || user.userType === "asha_worker") {
      // Scoped to the user's assigned place if set
      const [dbUser] = await db
        .select({ assignedPlace: systemUsersTable.assignedPlace })
        .from(systemUsersTable)
        .where(eq(systemUsersTable.id, user.id));
      
      if (dbUser?.assignedPlace) {
        placeCodes = [dbUser.assignedPlace];
      }
    }

    // If scoped to a list of places and that list is empty, return empty stats immediately
    if (placeCodes !== null && placeCodes.length === 0) {
      res.json({
        summary: {
          totalPatients: 0,
          todayScreening: 0,
          monthScreening: 0,
          positiveDR: 0,
          referredCount: 0,
          activeUsers: 0,
          plannedCamps: 0,
          doneCamps: 0,
          totalAreas: 0,
          visionCenterCount: 0,
          vcReferralCount: 0,
          vcConvertedCount: 0
        },
        charts: {
          locationStats: [],
          drDistribution: [],
          dailyTrend: [],
          monthlyTrend: [],
          talukStats: []
        }
      });
      return;
    }

    // Helper to generate scoped WHERE clauses dynamically for patients
    const getWhereClause = (extraCondition?: any) => {
      const conditions = [];
      if (placeCodes !== null) {
        conditions.push(inArray(patientsTable.screeningPlaceCode, placeCodes));
      }
      if (extraCondition) {
        conditions.push(extraCondition);
      }
      return conditions.length > 0 ? and(...conditions) : undefined;
    };

    // Helper to generate scoped WHERE clauses dynamically for camps/places
    const getPlacesWhereClause = (extraCondition?: any) => {
      const conditions = [];
      if (placeCodes !== null) {
        conditions.push(inArray(screeningPlacesTable.shortCode, placeCodes));
      }
      if (extraCondition) {
        conditions.push(extraCondition);
      }
      return conditions.length > 0 ? and(...conditions) : undefined;
    };

    // 1. Core KPIs
    // Total Patients
    const [totalPatientsResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(patientsTable)
      .where(getWhereClause());
    const totalPatients = Number(totalPatientsResult?.count || 0);

    // Today's Screening
    const [todayScreeningResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(patientsTable)
      .where(getWhereClause(eq(patientsTable.date, today)));
    const todayScreening = Number(todayScreeningResult?.count || 0);

    // This Month
    const [monthScreeningResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(patientsTable)
      .where(getWhereClause(sql`${patientsTable.date} LIKE ${currentMonth + "%"}`));
    const monthScreening = Number(monthScreeningResult?.count || 0);

    // Positive DR Cases (any status other than 'No DR' and 'Ungradable')
    const [positiveDRResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(patientsTable)
      .where(
        getWhereClause(
          and(
            not(eq(patientsTable.drStatus, "No DR")),
            not(eq(patientsTable.drStatus, "Ungradable"))
          )
        )
      );
    const positiveDR = Number(positiveDRResult?.count || 0);

    // Referred count
    const [referredResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(patientsTable)
      .where(getWhereClause(eq(patientsTable.referralStatus, "Referred")));
    const referredCount = Number(referredResult?.count || 0);

    // Active Users count (unaffected by place filters)
    const [usersResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(systemUsersTable)
      .where(eq(systemUsersTable.status, "active"));
    const activeUsers = Number(usersResult?.count || 0);

    // Planned Camps (places that are not 'completed')
    const [plannedCampsResult] = await db
      .select({ count: sql`COUNT(*)` })
      .from(screeningPlacesTable)
      .where(getPlacesWhereClause(not(eq(screeningPlacesTable.status, "completed"))));
    const plannedCamps = Number(plannedCampsResult?.count || 0);

    // Done Camps (places that are 'completed')
    const [doneCampsResult] = await db
      .select({ count: sql`COUNT(*)` })
      .from(screeningPlacesTable)
      .where(getPlacesWhereClause(eq(screeningPlacesTable.status, "completed")));
    const doneCamps = Number(doneCampsResult?.count || 0);

    // Distinct Taluks/Areas
    const [totalAreasResult] = await db
      .select({ count: sql`COUNT(DISTINCT ${screeningPlacesTable.taluk})` })
      .from(screeningPlacesTable)
      .where(getPlacesWhereClause());
    const totalAreas = Number(totalAreasResult?.count || 0);

    // Vision Center counts & referral metrics
    let vcQuery = db.select({ count: sql`COUNT(*)` }).from(visionCentersTable);
    if (user.assignedTrack && (user.userType === "admin_unit" || user.userType === "unit_head")) {
      vcQuery.where(eq(visionCentersTable.sankaraUnit, user.assignedTrack)) as any;
    }
    const [vcCountResult] = await vcQuery;
    const visionCenterCount = Number(vcCountResult?.count || 0);

    const [vcRefResult] = await db.select({ count: sql`COUNT(*)` }).from(vcReferralsTable);
    const vcReferralCount = Number(vcRefResult?.count || 0);

    const [vcConvResult] = await db.select({ count: sql`COUNT(*)` }).from(vcReferralsTable).where(eq(vcReferralsTable.status, "completed"));
    const vcConvertedCount = Number(vcConvResult?.count || 0);

    // 2. Charts Data
    // Location-wise Statistics
    const locationStatsRaw = await db
      .select({
        placeCode: patientsTable.screeningPlaceCode,
        count: sql`COUNT(*)`
      })
      .from(patientsTable)
      .where(getWhereClause())
      .groupBy(patientsTable.screeningPlaceCode);
    const locationStats = locationStatsRaw.map(row => ({
      placeCode: row.placeCode,
      count: Number(row.count || 0)
    }));

    // DR Distribution Statistics
    const drDistributionRaw = await db
      .select({
        status: patientsTable.drStatus,
        count: sql`COUNT(*)`
      })
      .from(patientsTable)
      .where(getWhereClause())
      .groupBy(patientsTable.drStatus);
    const drDistribution = drDistributionRaw.map(row => ({
      status: row.status,
      count: Number(row.count || 0)
    }));

    // Daily Trend (last 7 days of entries)
    const dailyTrendRaw = await db
      .select({
        date: patientsTable.date,
        count: sql`COUNT(*)`
      })
      .from(patientsTable)
      .where(getWhereClause())
      .groupBy(patientsTable.date)
      .orderBy(sql`${patientsTable.date} DESC`)
      .limit(7);
    const dailyTrend = dailyTrendRaw.map(row => ({
      date: row.date,
      count: Number(row.count || 0)
    })).reverse();

    // Monthly Trend (last 6 months)
    const monthlyTrendRaw = await db
      .select({
        month: sql<string>`SUBSTRING(${patientsTable.date} FROM 1 FOR 7)`,
        count: sql`COUNT(*)`
      })
      .from(patientsTable)
      .where(getWhereClause())
      .groupBy(sql`SUBSTRING(${patientsTable.date} FROM 1 FOR 7)`)
      .orderBy(sql`SUBSTRING(${patientsTable.date} FROM 1 FOR 7) DESC`)
      .limit(6);
    const monthlyTrend = monthlyTrendRaw.map(row => ({
      month: row.month,
      count: Number(row.count || 0)
    })).reverse();

    // Taluk-grouped patient stats
    const talukPatientStats = await db
      .select({
        taluk: screeningPlacesTable.taluk,
        count: sql`COUNT(*)`
      })
      .from(patientsTable)
      .innerJoin(
        screeningPlacesTable,
        eq(patientsTable.screeningPlaceCode, screeningPlacesTable.shortCode)
      )
      .where(getWhereClause())
      .groupBy(screeningPlacesTable.taluk);

    const talukStats = talukPatientStats.map(row => ({
      taluk: row.taluk || "Unknown",
      count: Number(row.count || 0)
    }));

    res.json({
      summary: {
        totalPatients,
        todayScreening,
        monthScreening,
        positiveDR,
        referredCount,
        activeUsers,
        plannedCamps,
        doneCamps,
        totalAreas,
        visionCenterCount,
        vcReferralCount,
        vcConvertedCount
      },
      charts: {
        locationStats,
        drDistribution,
        dailyTrend,
        monthlyTrend,
        talukStats
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load dashboard data: " + err.message });
  }
});

export default router;
