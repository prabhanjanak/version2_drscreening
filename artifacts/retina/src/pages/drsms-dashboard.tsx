import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, Calendar, Activity, MapPin, Eye, FileText, 
  ShieldAlert, ArrowUpRight, RefreshCw, Heart, Target, Sparkles, Truck, Phone, Check, Building2
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, PieChart, Pie, Cell, Legend
} from "recharts";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  summary: {
    totalPatients: number;
    todayScreening: number;
    monthScreening: number;
    positiveDR: number;
    referredCount: number;
    activeUsers: number;
    plannedCamps: number;
    doneCamps: number;
    totalAreas: number;
    visionCenterCount?: number;
    vcReferralCount?: number;
    vcConvertedCount?: number;
  };
  charts: {
    locationStats: Array<{ placeCode: string; count: number }>;
    drDistribution: Array<{ status: string; count: number }>;
    dailyTrend: Array<{ date: string; count: number }>;
    monthlyTrend: Array<{ month: string; count: number }>;
    talukStats: Array<{ taluk: string; count: number }>;
  };
}

const COLORS = ["#3B82F6", "#F59E0B", "#EF4444", "#10B981", "#6366F1", "#EC4899", "#8B5CF6", "#6B7280"];

export default function DrsmsDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCampCode, setActiveCampCode] = useState<string | null>(localStorage.getItem("activeCampCode"));
  const [referredPatients, setReferredPatients] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/dashboard/drsms", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load dashboard data");
      const json = await res.json();
      setData(json);

      // Fetch patients for logistics view
      if ((user?.userType as string) === "facility_manager") {
        const patientsRes = await fetch("/api/patients", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (patientsRes.ok) {
          const list = await patientsRes.json();
          setReferredPatients(list.filter((p: any) => p.referToBaseHospital === true));
        }
      }
    } catch (err: any) {
      toast({
        title: "Error loading stats",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    const checkActiveCamp = () => {
      setActiveCampCode(localStorage.getItem("activeCampCode"));
    };
    window.addEventListener("storage", checkActiveCamp);
    return () => window.removeEventListener("storage", checkActiveCamp);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
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
  };

  const getGreeting = () => {
    const role = user?.userType as string;
    if (role === "super_admin") return "Super Admin Console";
    if (role === "admin") return "System Admin Console";
    if (role === "admin_unit") return "Unit Coordinator Hub";
    if (role === "unit_head") return "Unit Head Clinical Dashboard";
    if (role === "facility_manager") return "Transportation & Logistics Control";
    return "Outreach Screening Portal";
  };

  const isFacilityManager = (user?.userType as string) === "facility_manager";
  const dailyTarget = 40;
  const targetPercent = Math.min(Math.round((summary.todayScreening / dailyTarget) * 100), 100);

  // ──── FACILITY MANAGER LOGISTICS VIEW ────
  if (isFacilityManager) {
    return (
      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#FF6B00]" /> {getGreeting()}
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Welcome, {user?.name}. Roster bus routes for referred patients.</p>
          </div>
          <Button onClick={fetchDashboardData} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 h-9 w-9 rounded-lg">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Logistics KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-xl border border-slate-200 shadow-xs bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Awaiting Transport</span>
                <p className="text-2xl font-extrabold text-slate-800">{referredPatients.length}</p>
                <p className="text-[9px] text-slate-400 font-semibold">Flagged for Sankara Base Hospital</p>
              </div>
              <div className="h-10 w-10 bg-orange-50 text-[#FF6B00] rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 shadow-xs bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Camps Today</span>
                <p className="text-2xl font-extrabold text-slate-800">{data?.charts.locationStats.length || 0}</p>
                <p className="text-[9px] text-slate-400 font-semibold">Outreach campsites generating referrals</p>
              </div>
              <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                <MapPin className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 shadow-xs bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logistics Status</span>
                <p className="text-2xl font-extrabold text-emerald-600">Active</p>
                <p className="text-[9px] text-emerald-500 font-bold">Rosters online</p>
              </div>
              <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient Transport list */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white overflow-hidden">
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">Referred Patients Bus Transport Roster</CardTitle>
            <CardDescription className="text-[10px]">Coordinate travel logistics for campsite screening referrals.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {referredPatients.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                No patients currently awaiting transport to the base hospital.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="p-4">Patient Name</th>
                      <th className="p-4">Unique ID</th>
                      <th className="p-4">Contact Phone</th>
                      <th className="p-4">Camp Place Code</th>
                      <th className="p-4">Diagnostics</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {referredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/40">
                        <td className="p-4 font-bold text-slate-900">{p.name}</td>
                        <td className="p-4 font-mono font-semibold text-slate-400">{p.uniqueId}</td>
                        <td className="p-4 font-mono">{p.phone}</td>
                        <td className="p-4 font-bold">{p.screeningPlaceCode}</td>
                        <td className="p-4">{p.drStatus}</td>
                        <td className="p-4">
                          <Button
                            onClick={() => toast({ title: "Roster Added", description: `Assigned ${p.name} to base hospital transit vehicle.` })}
                            className="bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white hover:from-[#FF6B00] hover:to-orange-600 text-[10px] h-7 px-3 rounded-lg font-bold"
                          >
                            Assign Bus
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ──── GENERAL CLINICAL/ADMIN DASHBOARD ────
  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#FF6B00]" /> {getGreeting()}
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Welcome back, {user?.name}. Here is today's camp summary.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button 
            onClick={fetchDashboardData} 
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 h-9 w-9 rounded-lg"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Link href="/patients/new" className="px-4 py-2 bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5">
            + New Screening
          </Link>
        </div>
      </div>


      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3.5">
        {/* Total Patients */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white overflow-hidden relative group hover:border-[#FF6B00] transition-all">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Patients</span>
              <p className="text-xl font-extrabold text-slate-800">{summary.totalPatients}</p>
              <p className="text-[8px] text-slate-400 font-semibold">{summary.monthScreening} this month</p>
            </div>
            <div className="h-8 w-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-orange-50 group-hover:text-[#FF6B00] transition-colors shrink-0">
              <FileText className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Today's Screenings */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white overflow-hidden relative group hover:border-[#FF6B00] transition-all">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Today's Count</span>
              <p className="text-xl font-extrabold text-slate-800">{summary.todayScreening}</p>
              <p className="text-[8px] text-slate-400 font-semibold">Target: {dailyTarget}</p>
            </div>
            <div className="h-8 w-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-orange-50 group-hover:text-[#FF6B00] transition-colors shrink-0">
              <Target className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Vision Centers */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white overflow-hidden relative group hover:border-[#FF6B00] transition-all">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Vision Centers</span>
              <p className="text-xl font-extrabold text-blue-600">{summary.visionCenterCount || 0}</p>
              <p className="text-[8px] text-slate-400 font-semibold">{summary.vcReferralCount || 0} VC Referrals</p>
            </div>
            <div className="h-8 w-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Planned Camps */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white overflow-hidden relative group hover:border-[#FF6B00] transition-all">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Planned Camps</span>
              <p className="text-xl font-extrabold text-slate-800">{summary.plannedCamps}</p>
              <p className="text-[8px] text-slate-400 font-semibold">Scheduled / Ongoing</p>
            </div>
            <div className="h-8 w-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-orange-50 group-hover:text-[#FF6B00] transition-colors shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Done Camps */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white overflow-hidden relative group hover:border-[#FF6B00] transition-all">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Done Camps</span>
              <p className="text-xl font-extrabold text-slate-800">{summary.doneCamps}</p>
              <p className="text-[8px] text-slate-400 font-semibold">Completed & Closed</p>
            </div>
            <div className="h-8 w-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-orange-50 group-hover:text-[#FF6B00] transition-colors shrink-0">
              <Check className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Areas / Taluks Covered */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white overflow-hidden relative group hover:border-[#FF6B00] transition-all">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Taluks Covered</span>
              <p className="text-xl font-extrabold text-slate-800">{summary.totalAreas}</p>
              <p className="text-[8px] text-slate-400 font-semibold">Active Locations</p>
            </div>
            <div className="h-8 w-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-orange-50 group-hover:text-[#FF6B00] transition-colors shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* DR Detected */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white overflow-hidden relative group hover:border-red-500 transition-all">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">DR Detected</span>
              <p className="text-xl font-extrabold text-red-600">{summary.positiveDR}</p>
              <p className="text-[8px] text-red-500 font-bold flex items-center gap-0.5">
                <ShieldAlert className="h-3 w-3" /> Positive Cases
              </p>
            </div>
            <div className="h-8 w-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-red-50 group-hover:text-red-500 transition-colors shrink-0">
              <Activity className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Base Hospital Referrals */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white overflow-hidden relative group hover:border-[#FF6B00] transition-all">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Referrals</span>
              <p className="text-xl font-extrabold text-slate-800">{summary.referredCount}</p>
              <p className="text-[8px] text-slate-400 font-semibold">
                {summary.referredCount > 0 && summary.positiveDR > 0 
                  ? `${Math.round((summary.referredCount / summary.positiveDR) * 100)}% refer rate` 
                  : "0% refer rate"}
              </p>
            </div>
            <div className="h-8 w-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-orange-50 group-hover:text-[#FF6B00] transition-colors shrink-0">
              <Heart className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role specific callout for field staff */}
      {((user?.userType as string) === "outreach") && (
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl shadow-md border-none overflow-hidden relative">
          <div className="p-6 relative z-10 space-y-2">
            <h2 className="text-base font-extrabold">Collect Camp Patient Record Drafts Offline</h2>
            <p className="text-xs text-orange-50 opacity-90 max-w-xl">
              Conduct fundus camera photography and save entries directly to device storage when offline. Queued records automatically synchronize once connectivity is restored.
            </p>
            <div className="pt-2">
              <Link href="/patients/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors shadow-xs">
                New Screening Entry
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-orange-700/20 skew-x-12 translate-x-12" />
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DR Status Distribution (Pie Chart) */}
        <Card className="rounded-xl border border-slate-200/80 shadow-xs bg-white">
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Activity className="h-4.5 w-4.5 text-[#FF6B00]" /> Diagnosis Severity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 h-64">
            {data?.charts.drDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                No diagnostic data recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                     data={data?.charts.drDistribution}
                     dataKey="count"
                     nameKey="status"
                     cx="50%"
                     cy="50%"
                     innerRadius={50}
                     outerRadius={70}
                     paddingAngle={3}
                  >
                    {data?.charts.drDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Patients`, "Count"]} />
                  <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: "9px", fontWeight: "bold" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Screenings by Taluk / Area (Bar Chart) */}
        <Card className="rounded-xl border border-slate-200/80 shadow-xs bg-white">
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MapPin className="h-4.5 w-4.5 text-[#FF6B00]" /> Screenings by Taluk / Area
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 h-64">
            {data?.charts.talukStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                No screenings recorded by Taluk.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.charts.talukStats}>
                  <XAxis dataKey="taluk" tick={{ fontSize: 9, fontWeight: "bold" }} />
                  <YAxis tick={{ fontSize: 9, fontWeight: "bold" }} />
                  <Tooltip formatter={(value) => [`${value} Screenings`, "Total"]} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Camp Registration Performance (Bar Chart) */}
        <Card className="rounded-xl border border-slate-200/80 shadow-xs bg-white">
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MapPin className="h-4.5 w-4.5 text-[#FF6B00]" /> Campsite Coverage Count
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 h-64">
            {data?.charts.locationStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                No campsites mapped yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.charts.locationStats}>
                  <XAxis dataKey="placeCode" tick={{ fontSize: 9, fontWeight: "bold" }} />
                  <YAxis tick={{ fontSize: 9, fontWeight: "bold" }} />
                  <Tooltip formatter={(value) => [`${value} Screenings`, "Total"]} />
                  <Bar dataKey="count" fill="#FF6B00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
