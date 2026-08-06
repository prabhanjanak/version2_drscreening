import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Activity, Users, ShieldAlert, Database, Cpu, HardDrive, 
  MapPin, CheckCircle, Clock, Smartphone, Laptop, RefreshCw, Eye, ArrowUpRight, TrendingUp, Layers, Heart
} from "lucide-react";

export default function DrsmsAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/superadmin/analytics", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed with status ${res.status}`);
      }
      const result = await res.json();
      setData(result);
      if (showToast) {
        toast({ title: "Analytics Refreshed! ⚡", description: "System stats and active session logs updated." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(() => fetchAnalytics(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin text-[#FF6B00]" /> Loading Super Admin System & Website Stats...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dbRecordCounts, activeSessions, userRoleBreakdown, clinicalMetrics, referralMetrics, regionalMetrics, systemHealth } = data;

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 bg-slate-50/50 space-y-6 overflow-y-auto font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Super Admin System & Usage Analytics</h1>
            <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              Live Monitor
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time active user sessions, database record health, clinical metrics & platform usage stats.
          </p>
        </div>

        <Button
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
          className="bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white font-extrabold text-xs h-9 px-4 rounded-xl shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh Live Stats
        </Button>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Active Logged-in Sessions */}
        <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Logged-In Users</p>
            <p className="text-2xl font-black text-slate-900">{activeSessions.activeUserCount}</p>
            <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active in last 30 mins
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Activity className="h-6 w-6" />
          </div>
        </Card>

        {/* Total Screened Patients */}
        <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Patients Screened</p>
            <p className="text-2xl font-black text-slate-900">{clinicalMetrics.totalScreened}</p>
            <p className="text-[10px] font-bold text-[#FF6B00]">
              {clinicalMetrics.positiveDRPercentage}% Positive DR Rate
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-orange-50 text-[#FF6B00] flex items-center justify-center font-bold">
            <Eye className="h-6 w-6" />
          </div>
        </Card>

        {/* Patient Referrals Conversion */}
        <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Referrals Converted</p>
            <p className="text-2xl font-black text-slate-900">{referralMetrics.completedReferrals} / {referralMetrics.totalReferrals}</p>
            <p className="text-[10px] font-bold text-blue-600">
              {referralMetrics.conversionRate}% Camp Screening Rate
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Heart className="h-6 w-6" />
          </div>
        </Card>

        {/* Server System Memory */}
        <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Node.js Memory (Heap)</p>
            <p className="text-2xl font-black text-slate-900">{systemHealth.heapUsedMb} MB</p>
            <p className="text-[10px] font-bold text-purple-600">
              Uptime: {Math.floor(systemHealth.uptimeSeconds / 60)} mins ({systemHealth.nodeVersion})
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Cpu className="h-6 w-6" />
          </div>
        </Card>

      </div>

      {/* Database Record Counts & Health Row */}
      <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white overflow-hidden">
        <CardHeader className="py-3.5 px-5 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4.5 w-4.5 text-[#FF6B00]" />
            <div>
              <CardTitle className="text-xs font-bold text-slate-900 uppercase">Database Table Health & Record Counts</CardTitle>
              <CardDescription className="text-[10px]">Real-time PostgreSQL row counts across all core tables.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Patients</p>
            <p className="text-lg font-black text-slate-900">{dbRecordCounts.patients}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">VC & Field Referrals</p>
            <p className="text-lg font-black text-slate-900">{dbRecordCounts.vcReferrals}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">DR Camps</p>
            <p className="text-lg font-black text-slate-900">{dbRecordCounts.screeningCamps}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Staff Users</p>
            <p className="text-lg font-black text-slate-900">{dbRecordCounts.systemUsers}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Vision Centers</p>
            <p className="text-lg font-black text-slate-900">{dbRecordCounts.visionCenters}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Sessions</p>
            <p className="text-lg font-black text-slate-900">{dbRecordCounts.totalSessions}</p>
          </div>
        </CardContent>
      </Card>

      {/* 2-Column Grid: Active User Sessions Table & User Role Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active User Sessions Table (8 Cols) */}
        <Card className="lg:col-span-8 rounded-2xl border border-slate-200 shadow-xs bg-white overflow-hidden">
          <CardHeader className="py-3.5 px-5 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
                <Users className="h-4 w-4 text-[#FF6B00]" /> Active Logged-In User Sessions
              </CardTitle>
              <CardDescription className="text-[10px]">
                Showing active staff members online in the last 30 minutes
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {activeSessions.sessionsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                No active sessions detected in the last 30 minutes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-100/70 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Device</th>
                      <th className="py-2.5 px-4">IP Address</th>
                      <th className="py-2.5 px-4">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeSessions.sessionsList.map((sess: any) => (
                      <tr key={sess.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{sess.userName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-orange-50 text-[#FF6B00] border border-orange-200 text-[10px] font-bold rounded">
                            {sess.userType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 flex items-center gap-1.5">
                          {sess.deviceType === "mobile" ? <Smartphone className="h-3.5 w-3.5 text-slate-400" /> : <Laptop className="h-3.5 w-3.5 text-slate-400" />}
                          <span className="capitalize">{sess.deviceName || sess.deviceType}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{sess.ipAddress}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(sess.lastSeenAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Role Distribution Card (4 Cols) */}
        <Card className="lg:col-span-4 rounded-2xl border border-slate-200 shadow-xs bg-white overflow-hidden">
          <CardHeader className="py-3.5 px-5 bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#FF6B00]" /> Staff Role Breakdown
            </CardTitle>
            <CardDescription className="text-[10px]">Total registered accounts by role type</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {userRoleBreakdown.map((r: any) => (
              <div key={r.role} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold text-slate-800 capitalize">{r.role.replace(/_/g, " ")}</span>
                <span className="text-xs font-black text-[#FF6B00] bg-orange-100/60 px-2 py-0.5 rounded-md">
                  {r.count} accounts
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      {/* Clinical DR Findings & Regional Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DR Diagnosis Stats */}
        <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white overflow-hidden">
          <CardHeader className="py-3.5 px-5 bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#FF6B00]" /> DR Clinical Severity Distribution
            </CardTitle>
            <CardDescription className="text-[10px]">Diagnosis findings across all screened patients</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {clinicalMetrics.drDistribution.map((d: any) => (
              <div key={d.status} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-extrabold text-slate-800">{d.status}</span>
                <span className="text-xs font-black text-slate-900 bg-slate-200/70 px-2 py-0.5 rounded-md">
                  {d.count} patients
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Regional Coverage Metrics */}
        <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white overflow-hidden">
          <CardHeader className="py-3.5 px-5 bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#FF6B00]" /> Outreach Regional Coverage
            </CardTitle>
            <CardDescription className="text-[10px]">Districts, Taluks & Sankara Hospital Units</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="text-[10px] font-extrabold text-orange-800 uppercase">Districts Covered</p>
                <p className="text-2xl font-black text-[#FF6B00]">{regionalMetrics.districtsCovered}</p>
              </div>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="text-[10px] font-extrabold text-orange-800 uppercase">Taluks / Sub-Districts</p>
                <p className="text-2xl font-black text-[#FF6B00]">{regionalMetrics.taluksCovered}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Campsite Distribution by Hospital Unit</p>
              {regionalMetrics.sankaraUnits.map((u: any) => (
                <div key={u.unit} className="flex items-center justify-between text-xs font-semibold p-2 bg-slate-50 rounded-lg">
                  <span className="truncate max-w-[240px] text-slate-700">{u.unit}</span>
                  <span className="font-bold text-[#FF6B00]">{u.count} camps</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
