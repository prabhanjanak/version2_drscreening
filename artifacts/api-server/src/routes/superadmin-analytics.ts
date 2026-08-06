import { Router } from "express";
import { eq, sql, gte, desc } from "drizzle-orm";
import { 
  db, patientsTable, systemUsersTable, screeningPlacesTable, 
  visionCentersTable, vcReferralsTable, activeSessionsTable 
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/superadmin/analytics - Comprehensive Super Admin System Analytics & Website Usage Stats
router.get("/superadmin/analytics", requireAuth(["super_admin", "admin"]), async (_req, res) => {
  try {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // 1. DATABASE RECORD COUNTS
    const [patientCount] = await db.select({ count: sql`COUNT(*)` }).from(patientsTable);
    const [vcReferralCount] = await db.select({ count: sql`COUNT(*)` }).from(vcReferralsTable);
    const [campCount] = await db.select({ count: sql`COUNT(*)` }).from(screeningPlacesTable);
    const [userCount] = await db.select({ count: sql`COUNT(*)` }).from(systemUsersTable);
    const [vcCount] = await db.select({ count: sql`COUNT(*)` }).from(visionCentersTable);
    const [sessionCount] = await db.select({ count: sql`COUNT(*)` }).from(activeSessionsTable);

    // 2. ACTIVE LOGGED-IN USERS & SESSIONS (Last 30 mins)
    const activeSessions = await db
      .select({
        id: activeSessionsTable.id,
        userName: activeSessionsTable.userName,
        userType: activeSessionsTable.userType,
        ipAddress: activeSessionsTable.ipAddress,
        deviceName: activeSessionsTable.deviceName,
        deviceType: activeSessionsTable.deviceType,
        lastSeenAt: activeSessionsTable.lastSeenAt,
        createdAt: activeSessionsTable.createdAt,
      })
      .from(activeSessionsTable)
      .where(gte(activeSessionsTable.lastSeenAt, thirtyMinutesAgo))
      .orderBy(desc(activeSessionsTable.lastSeenAt))
      .limit(20);

    // Device Type Breakdown
    const deviceTypeStats = await db
      .select({
        deviceType: activeSessionsTable.deviceType,
        count: sql`COUNT(*)`
      })
      .from(activeSessionsTable)
      .groupBy(activeSessionsTable.deviceType);

    // 3. ROLE-WISE USER BREAKDOWN
    const roleStatsRaw = await db
      .select({
        userType: systemUsersTable.userType,
        count: sql`COUNT(*)`
      })
      .from(systemUsersTable)
      .groupBy(systemUsersTable.userType);

    // 4. CLINICAL & DR SCREENING ANALYTICS
    const drDistributionRaw = await db
      .select({
        status: patientsTable.drStatus,
        count: sql`COUNT(*)`
      })
      .from(patientsTable)
      .groupBy(patientsTable.drStatus);

    const [drPositiveCount] = await db
      .select({ count: sql`COUNT(*)` })
      .from(patientsTable)
      .where(sql`${patientsTable.drStatus} NOT IN ('No DR', 'Ungradable')`);

    const [baseHospitalReferredCount] = await db
      .select({ count: sql`COUNT(*)` })
      .from(patientsTable)
      .where(eq(patientsTable.referToBaseHospital, true));

    const imageQualityStats = await db
      .select({
        quality: patientsTable.imageQuality,
        count: sql`COUNT(*)`
      })
      .from(patientsTable)
      .groupBy(patientsTable.imageQuality);

    // 5. REFERRAL CONVERSION METRICS
    const [completedReferralsCount] = await db
      .select({ count: sql`COUNT(*)` })
      .from(vcReferralsTable)
      .where(eq(vcReferralsTable.status, "completed"));

    const [followUpRequiredCount] = await db
      .select({ count: sql`COUNT(*)` })
      .from(vcReferralsTable)
      .where(eq(vcReferralsTable.status, "follow_up_required"));

    // 6. REGIONAL & CAMP STATISTICS
    const [activeCampsCount] = await db
      .select({ count: sql`COUNT(*)` })
      .from(screeningPlacesTable)
      .where(eq(screeningPlacesTable.status, "active"));

    const [completedCampsCount] = await db
      .select({ count: sql`COUNT(*)` })
      .from(screeningPlacesTable)
      .where(eq(screeningPlacesTable.status, "completed"));

    const [districtsCount] = await db
      .select({ count: sql`COUNT(DISTINCT ${screeningPlacesTable.district})` })
      .from(screeningPlacesTable);

    const [taluksCount] = await db
      .select({ count: sql`COUNT(DISTINCT ${screeningPlacesTable.taluk})` })
      .from(screeningPlacesTable);

    // Unit-wise Camp Distribution
    const sankaraUnitStats = await db
      .select({
        unit: screeningPlacesTable.sankaraUnit,
        count: sql`COUNT(*)`
      })
      .from(screeningPlacesTable)
      .groupBy(screeningPlacesTable.sankaraUnit);

    // 7. SYSTEM & NODE MEMORY HEALTH
    const memoryUsage = process.memoryUsage();
    const memoryStats = {
      rssMb: (memoryUsage.rss / (1024 * 1024)).toFixed(2),
      heapTotalMb: (memoryUsage.heapTotal / (1024 * 1024)).toFixed(2),
      heapUsedMb: (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2),
      externalMb: (memoryUsage.external / (1024 * 1024)).toFixed(2),
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
    };

    res.json({
      dbRecordCounts: {
        patients: Number(patientCount?.count || 0),
        vcReferrals: Number(vcReferralCount?.count || 0),
        screeningCamps: Number(campCount?.count || 0),
        systemUsers: Number(userCount?.count || 0),
        visionCenters: Number(vcCount?.count || 0),
        totalSessions: Number(sessionCount?.count || 0),
      },
      activeSessions: {
        activeUserCount: activeSessions.length,
        sessionsList: activeSessions,
        deviceTypes: deviceTypeStats.map(d => ({ deviceType: d.deviceType || "Web", count: Number(d.count || 0) })),
      },
      userRoleBreakdown: roleStatsRaw.map(r => ({ role: r.userType, count: Number(r.count || 0) })),
      clinicalMetrics: {
        totalScreened: Number(patientCount?.count || 0),
        positiveDRCount: Number(drPositiveCount?.count || 0),
        positiveDRPercentage: Number(patientCount?.count || 0) > 0 
          ? ((Number(drPositiveCount?.count || 0) / Number(patientCount?.count || 0)) * 100).toFixed(1) 
          : "0.0",
        baseHospitalReferredCount: Number(baseHospitalReferredCount?.count || 0),
        drDistribution: drDistributionRaw.map(d => ({ status: d.status, count: Number(d.count || 0) })),
        imageQualityStats: imageQualityStats.map(q => ({ quality: q.quality, count: Number(q.count || 0) })),
      },
      referralMetrics: {
        totalReferrals: Number(vcReferralCount?.count || 0),
        completedReferrals: Number(completedReferralsCount?.count || 0),
        followUpRequired: Number(followUpRequiredCount?.count || 0),
        conversionRate: Number(vcReferralCount?.count || 0) > 0
          ? ((Number(completedReferralsCount?.count || 0) / Number(vcReferralCount?.count || 0)) * 100).toFixed(1)
          : "0.0",
      },
      regionalMetrics: {
        totalCamps: Number(campCount?.count || 0),
        activeCamps: Number(activeCampsCount?.count || 0),
        completedCamps: Number(completedCampsCount?.count || 0),
        districtsCovered: Number(districtsCount?.count || 0),
        taluksCovered: Number(taluksCount?.count || 0),
        sankaraUnits: sankaraUnitStats.map(u => ({ unit: u.unit || "Unassigned", count: Number(u.count || 0) })),
      },
      systemHealth: memoryStats,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load superadmin analytics: " + err.message });
  }
});

export default router;
