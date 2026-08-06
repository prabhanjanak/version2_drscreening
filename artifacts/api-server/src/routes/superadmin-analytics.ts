import { Router } from "express";
import { eq, sql, gte, desc } from "drizzle-orm";
import { 
  db, patientsTable, systemUsersTable, screeningPlacesTable, 
  visionCentersTable, vcReferralsTable, activeSessionsTable 
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/superadmin/analytics - Comprehensive System Analytics & Website Usage Stats
router.get(
  "/superadmin/analytics",
  requireAuth(["super_admin", "admin", "admin_unit", "unit_head", "outreach", "ophthalmic_officer", "doctor"]),
  async (_req, res) => {
    try {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      // 1. DATABASE RECORD COUNTS
      let patientCount = 0;
      let vcReferralCount = 0;
      let campCount = 0;
      let userCount = 0;
      let vcCount = 0;
      let sessionCount = 0;

      try {
        const [r] = await db.select({ count: sql`COUNT(*)` }).from(patientsTable);
        patientCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        const [r] = await db.select({ count: sql`COUNT(*)` }).from(vcReferralsTable);
        vcReferralCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        const [r] = await db.select({ count: sql`COUNT(*)` }).from(screeningPlacesTable);
        campCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        const [r] = await db.select({ count: sql`COUNT(*)` }).from(systemUsersTable);
        userCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        const [r] = await db.select({ count: sql`COUNT(*)` }).from(visionCentersTable);
        vcCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        const [r] = await db.select({ count: sql`COUNT(*)` }).from(activeSessionsTable);
        sessionCount = Number(r?.count || 0);
      } catch (e) {}

      // 2. ACTIVE LOGGED-IN USERS & SESSIONS
      let activeSessions: any[] = [];
      try {
        activeSessions = await db
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
      } catch (e) {
        // Fallback: fetch recent sessions without gte filter if any field null
        try {
          activeSessions = await db
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
            .orderBy(desc(activeSessionsTable.id))
            .limit(20);
        } catch (e2) {}
      }

      // Device Type Breakdown
      let deviceTypeStats: any[] = [];
      try {
        deviceTypeStats = await db
          .select({
            deviceType: activeSessionsTable.deviceType,
            count: sql`COUNT(*)`
          })
          .from(activeSessionsTable)
          .groupBy(activeSessionsTable.deviceType);
      } catch (e) {}

      // 3. ROLE-WISE USER BREAKDOWN
      let roleStatsRaw: any[] = [];
      try {
        roleStatsRaw = await db
          .select({
            userType: systemUsersTable.userType,
            count: sql`COUNT(*)`
          })
          .from(systemUsersTable)
          .groupBy(systemUsersTable.userType);
      } catch (e) {}

      // 4. CLINICAL & DR SCREENING ANALYTICS
      let drDistributionRaw: any[] = [];
      let drPositiveCount = 0;
      let baseHospitalReferredCount = 0;
      let imageQualityStats: any[] = [];

      try {
        drDistributionRaw = await db
          .select({
            status: patientsTable.drStatus,
            count: sql`COUNT(*)`
          })
          .from(patientsTable)
          .groupBy(patientsTable.drStatus);
      } catch (e) {}

      try {
        const [r] = await db
          .select({ count: sql`COUNT(*)` })
          .from(patientsTable)
          .where(sql`${patientsTable.drStatus} NOT IN ('No DR', 'Ungradable')`);
        drPositiveCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        const [r] = await db
          .select({ count: sql`COUNT(*)` })
          .from(patientsTable)
          .where(eq(patientsTable.referToBaseHospital, true));
        baseHospitalReferredCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        imageQualityStats = await db
          .select({
            quality: patientsTable.imageQuality,
            count: sql`COUNT(*)`
          })
          .from(patientsTable)
          .groupBy(patientsTable.imageQuality);
      } catch (e) {}

      // 5. REFERRAL CONVERSION METRICS
      let completedReferralsCount = 0;
      let followUpRequiredCount = 0;

      try {
        const [r] = await db
          .select({ count: sql`COUNT(*)` })
          .from(vcReferralsTable)
          .where(eq(vcReferralsTable.status, "completed"));
        completedReferralsCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        const [r] = await db
          .select({ count: sql`COUNT(*)` })
          .from(vcReferralsTable)
          .where(eq(vcReferralsTable.status, "follow_up_required"));
        followUpRequiredCount = Number(r?.count || 0);
      } catch (e) {}

      // 6. REGIONAL & CAMP STATISTICS
      let activeCampsCount = 0;
      let completedCampsCount = 0;
      let districtsCount = 0;
      let taluksCount = 0;
      let sankaraUnitStats: any[] = [];

      try {
        const [r] = await db
          .select({ count: sql`COUNT(*)` })
          .from(screeningPlacesTable)
          .where(eq(screeningPlacesTable.status, "active"));
        activeCampsCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        const [r] = await db
          .select({ count: sql`COUNT(*)` })
          .from(screeningPlacesTable)
          .where(eq(screeningPlacesTable.status, "completed"));
        completedCampsCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        const [r] = await db
          .select({ count: sql`COUNT(DISTINCT ${screeningPlacesTable.district})` })
          .from(screeningPlacesTable);
        districtsCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        const [r] = await db
          .select({ count: sql`COUNT(DISTINCT ${screeningPlacesTable.taluk})` })
          .from(screeningPlacesTable);
        taluksCount = Number(r?.count || 0);
      } catch (e) {}

      try {
        sankaraUnitStats = await db
          .select({
            unit: screeningPlacesTable.sankaraUnit,
            count: sql`COUNT(*)`
          })
          .from(screeningPlacesTable)
          .groupBy(screeningPlacesTable.sankaraUnit);
      } catch (e) {}

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
          patients: patientCount,
          vcReferrals: vcReferralCount,
          screeningCamps: campCount,
          systemUsers: userCount,
          visionCenters: vcCount,
          totalSessions: sessionCount,
        },
        activeSessions: {
          activeUserCount: activeSessions.length,
          sessionsList: activeSessions,
          deviceTypes: deviceTypeStats.map((d) => ({ deviceType: d.deviceType || "Web", count: Number(d.count || 0) })),
        },
        userRoleBreakdown: roleStatsRaw.map((r) => ({ role: r.userType, count: Number(r.count || 0) })),
        clinicalMetrics: {
          totalScreened: patientCount,
          positiveDRCount: drPositiveCount,
          positiveDRPercentage: patientCount > 0 
            ? ((drPositiveCount / patientCount) * 100).toFixed(1) 
            : "0.0",
          baseHospitalReferredCount: baseHospitalReferredCount,
          drDistribution: drDistributionRaw.map((d) => ({ status: d.status, count: Number(d.count || 0) })),
          imageQualityStats: imageQualityStats.map((q) => ({ quality: q.quality, count: Number(q.count || 0) })),
        },
        referralMetrics: {
          totalReferrals: vcReferralCount,
          completedReferrals: completedReferralsCount,
          followUpRequired: followUpRequiredCount,
          conversionRate: vcReferralCount > 0
            ? ((completedReferralsCount / vcReferralCount) * 100).toFixed(1)
            : "0.0",
        },
        regionalMetrics: {
          totalCamps: campCount,
          activeCamps: activeCampsCount,
          completedCamps: completedCampsCount,
          districtsCovered: districtsCount,
          taluksCovered: taluksCount,
          sankaraUnits: sankaraUnitStats.map((u) => ({ unit: u.unit || "Unassigned", count: Number(u.count || 0) })),
        },
        systemHealth: memoryStats,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load analytics: " + err.message });
    }
  }
);

export default router;
