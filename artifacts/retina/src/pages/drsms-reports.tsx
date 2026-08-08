import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, Download, Filter, Calendar, MapPin, 
  Users, Activity, RefreshCw, Search, CheckCircle, ShieldAlert, Heart
} from "lucide-react";

interface PatientReportItem {
  id: number;
  uniqueId: string;
  date: string;
  screeningPlaceCode: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  address?: string | null;
  diabetesDuration: string;
  bloodPressure?: string | null;
  drStatus: string;
  advice: string;
  referToBaseHospital?: boolean;
  baseHospitalRemarks?: string | null;
  remarks?: string | null;
  referralStatus: string;
  imageQuality: string;
  imagePath: string;
  createdAt: string;
}

export default function DrsmsReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [places, setPlaces] = useState<any[]>([]);
  const [patients, setPatients] = useState<PatientReportItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filter Form States
  const [date, setDate] = useState("");
  const [place, setPlace] = useState("");
  const [drStatus, setDrStatus] = useState("");
  const [advice, setAdvice] = useState("");
  const [gender, setGender] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPlaces = async () => {
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/screening-places", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlaces(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReportPreview = async () => {
    setLoadingPreview(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const queryParams = new URLSearchParams();
      if (date) queryParams.append("date", date);
      if (place) queryParams.append("place", place);
      if (drStatus) queryParams.append("status", drStatus);
      if (gender) queryParams.append("gender", gender);

      const res = await fetch(`/api/patients?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
    fetchReportPreview();
  }, [date, place, drStatus, gender]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const queryParams = new URLSearchParams();
      if (date) queryParams.append("date", date);
      if (place) queryParams.append("place", place);
      if (drStatus) queryParams.append("status", drStatus);
      if (advice) queryParams.append("advice", advice);
      if (gender) queryParams.append("gender", gender);
      if (searchQuery) queryParams.append("search", searchQuery);

      const res = await fetch(`/api/patients-export?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to export report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DRSMS_Clinical_Report_${place || "AllCamps"}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({ 
        title: "Export Successful! 📊", 
        description: "Your clinical screening Excel/CSV report with all typed advice and remarks has been downloaded." 
      });
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Filter client-side preview list based on advice and search query
  const filteredPreview = patients.filter((p) => {
    const matchesAdvice = !advice || (p.advice && p.advice.toLowerCase().includes(advice.toLowerCase()));
    const matchesSearch = !searchQuery || (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.uniqueId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.advice && p.advice.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.remarks && p.remarks.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.baseHospitalRemarks && p.baseHospitalRemarks.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return matchesAdvice && matchesSearch;
  });

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-[#FF6B00]" /> Advanced Reports & Data Export
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Generate, filter, preview, and export full clinical screening reports with complete typed advice and doctor notes.
          </p>
        </div>

        <Button 
          onClick={handleExportCSV}
          disabled={exporting}
          className="bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white font-extrabold h-9 text-xs rounded-xl px-5 flex items-center gap-2 shadow-sm shrink-0"
        >
          {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export Excel / CSV ({filteredPreview.length} Records)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters Card */}
        <Card className="rounded-xl border border-slate-200 shadow-xs lg:col-span-2 bg-white">
          <CardHeader className="py-3.5 border-b border-slate-100 bg-orange-50/30">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-[#FF6B00]" /> Report Scope & Filter Parameters
                </CardTitle>
                <CardDescription className="text-[11px]">Filter screening records across camps, dates, and diagnoses.</CardDescription>
              </div>
              <span className="text-xs font-extrabold text-[#FF6B00] bg-orange-100/80 px-2.5 py-1 rounded-lg">
                {filteredPreview.length} Matches
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            
            {/* Filters Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Campsite Location</label>
                <select
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#FF6B00] font-medium"
                >
                  <option value="">All Camp Places</option>
                  {places.map(p => (
                    <option key={p.id} value={p.shortCode}>{p.name} ({p.shortCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Camp / Screening Date</label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#FF6B00] font-medium"
                />
              </div>
            </div>

            {/* Filters Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">DR Diagnosis / Stage</label>
                <select
                  value={drStatus}
                  onChange={(e) => setDrStatus(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#FF6B00] font-medium"
                >
                  <option value="">All DR Stages</option>
                  <option value="No DR">No DR</option>
                  <option value="Mild NPDR">Mild NPDR</option>
                  <option value="Moderate NPDR">Moderate NPDR</option>
                  <option value="Severe NPDR">Severe NPDR</option>
                  <option value="PDR">PDR</option>
                  <option value="Macular Edema">Macular Edema</option>
                  <option value="Ungradable">Ungradable</option>
                  <option value="Refer">Refer</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Advice Category</label>
                <select
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#FF6B00] font-medium"
                >
                  <option value="">All Recommendations</option>
                  <option value="Annual Review">Annual Review</option>
                  <option value="6 Month Review">6 Month Review</option>
                  <option value="3 Month Review">3 Month Review</option>
                  <option value="Urgent Retina Consultation">Urgent Retina Consultation</option>
                  <option value="Laser Required">Laser Required</option>
                  <option value="Injection Required">Injection Required</option>
                  <option value="Observation">Observation</option>
                  <option value="Refer to Sankara">Refer to Sankara</option>
                  <option value="Others">Others (Custom Typed)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#FF6B00] font-medium"
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Keyword Search in Typed Advice & Remarks */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                Search Typed Advice, Notes, Remarks, Patient Name or Phone
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Type any word from custom advice, remarks, hospital notes, or patient name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-[#FF6B00] font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button 
                onClick={() => { setDate(""); setPlace(""); setDrStatus(""); setAdvice(""); setGender(""); setSearchQuery(""); }}
                variant="outline"
                className="text-xs h-8 rounded-lg px-4"
              >
                Reset All Filters
              </Button>
              <Button 
                onClick={handleExportCSV}
                disabled={exporting}
                className="bg-[#FF6B00] hover:bg-orange-600 text-white font-bold h-8 text-xs rounded-lg px-4 flex items-center gap-1.5 shadow-xs"
              >
                {exporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Download CSV / Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Report Insights Card */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white flex flex-col justify-between">
          <CardHeader className="py-3.5 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-[#FF6B00]" /> Export Inclusions
            </CardTitle>
            <CardDescription className="text-[11px]">Included clinical fields in CSV / Excel</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs text-slate-600">
            <div className="space-y-2 text-[11px]">
              <p className="flex items-start gap-1.5 font-medium text-slate-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Typed Advice Details</strong>: Full custom text typed into the advice input box.</span>
              </p>
              <p className="flex items-start gap-1.5 font-medium text-slate-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Base Hospital Notes</strong>: Referral reasons & surgical recommendations.</span>
              </p>
              <p className="flex items-start gap-1.5 font-medium text-slate-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>General Remarks</strong>: Full clinical observations and systemic notes.</span>
              </p>
              <p className="flex items-start gap-1.5 font-medium text-slate-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Vitals & Demographics</strong>: BP (mmHg), Diabetes Duration, Age, Phone, Village.</span>
              </p>
              <p className="flex items-start gap-1.5 font-medium text-slate-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Unique ID</strong>: Standard SEH/CAMP/DDMMYYYY/XXXX serial numbers.</span>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="w-full text-xs h-8 rounded-lg font-bold flex items-center justify-center gap-1.5 border-slate-300 text-slate-700"
              >
                <FileText className="h-3.5 w-3.5" /> Print / Save as PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Data Preview Table */}
      <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="py-3.5 px-4 md:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Live Filtered Patient Report Preview ({filteredPreview.length} Records)
            </CardTitle>
            <CardDescription className="text-[11px]">
              Showing all clinical fields, advice, and typed remarks exactly as formatted for Excel export.
            </CardDescription>
          </div>
          <Button onClick={fetchReportPreview} variant="ghost" size="sm" className="h-8 text-xs font-semibold text-slate-600">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingPreview ? "animate-spin" : ""}`} /> Refresh Table
          </Button>
        </CardHeader>

        <div className="overflow-x-auto max-h-[500px]">
          {loadingPreview ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading patient report preview...</div>
          ) : filteredPreview.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-slate-50">
              No patient screening records match the specified filters. Try adjusting or clearing filters above.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-100/80 text-slate-700 text-[10px] font-black uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="p-3">Camp Date & ID</th>
                  <th className="p-3">Patient Details</th>
                  <th className="p-3">Referral & Schemes</th>
                  <th className="p-3">DR Stage</th>
                  <th className="p-3">Cataract Segregation</th>
                  <th className="p-3">GRBS / Glucose</th>
                  <th className="p-3">Advice / Action Plan</th>
                  <th className="p-3">Base Hospital Follow-Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPreview.map((p: any) => (
                  <tr key={p.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-extrabold text-[#FF6B00] block">{p.uniqueId}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{p.date}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">{p.name}</span>
                      <span className="text-[10px] text-slate-500">{p.age} Yrs • {p.gender} • 📞 {p.phone}</span>
                      <span className="text-[10px] text-slate-400 block">{p.address || p.screeningPlaceCode}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800 text-[11px] block">📢 {p.referralSource || "ASHA Outreach"}</span>
                      {p.referredToGiftOfVision && (
                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-300 inline-block mt-0.5">
                          🎁 Gift of Vision
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-[#FF6B00] border border-orange-200 inline-block">
                        {p.drStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      {p.hasCataract && p.hasCataract !== "None" ? (
                        <div>
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold block w-fit">
                            👁️ {p.hasCataract}
                          </span>
                          {p.cataractPlanning && (
                            <span className="text-[9px] text-amber-800 font-medium block mt-0.5">
                              Plan: {p.cataractPlanning}
                            </span>
                          )}
                        </div>
                      ) : <span className="text-[10px] text-slate-400">None</span>}
                    </td>
                    <td className="p-3 whitespace-nowrap text-[11px]">
                      {p.diabetesMeasureValue ? (
                        <span className="font-black text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          {p.diabetesMeasureType || "GRBS"}: {p.diabetesMeasureValue}
                        </span>
                      ) : <span className="text-slate-400">-</span>}
                      <p className="text-[9px] text-slate-400 mt-0.5">BP: {p.bloodPressure || "120/80"}</p>
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="font-semibold text-slate-900 text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200">
                        {p.advice || "Annual Review"}
                      </div>
                    </td>
                    <td className="p-3 max-w-xs space-y-1">
                      {p.visitedBaseHospital ? (
                        <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded text-[10px] text-emerald-900 font-medium">
                          <p className="font-bold">Visited Base Hospital ✓</p>
                          <p className="text-[9px] font-mono">{p.baseHospitalVisitOutcome || "Management Done"}</p>
                        </div>
                      ) : p.referToBaseHospital ? (
                        <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded block w-fit">
                          Referred to Base
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Not Visited</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

