import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, Download, Filter, Calendar, MapPin, 
  Users, Activity, RefreshCw 
} from "lucide-react";

export default function DrsmsReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [places, setPlaces] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  // Filter Form States
  const [date, setDate] = useState("");
  const [place, setPlace] = useState("");
  const [drStatus, setDrStatus] = useState("");
  const [advice, setAdvice] = useState("");
  const [gender, setGender] = useState("");

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

  useEffect(() => {
    fetchPlaces();
  }, []);

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

      const res = await fetch(`/api/patients-export?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to export report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DRSMS_Report_Export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: "Export Successful", description: "Your CSV screening report has been downloaded." });
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Advanced Reports & Exports</h1>
        <p className="text-sm text-slate-500">Generate, filter, and export CSV/Excel clinical screening reports.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters Card */}
        <Card className="rounded-xl border border-slate-200 shadow-xs lg:col-span-2 bg-white">
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-1.5">
              <Filter className="h-4.5 w-4.5 text-[#FF6B00]" /> Export Parameters
            </CardTitle>
            <CardDescription className="text-xs">Specify filters below to scope the exported patient database entries.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 text-xs">
            
            {/* Filters Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Campsite Location</label>
                <select
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">All Camp Places</option>
                  {places.map(p => (
                    <option key={p.id} value={p.shortCode}>{p.name} ({p.shortCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Screening Date</label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
            </div>

            {/* Filters Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">DR Status</label>
                <select
                  value={drStatus}
                  onChange={(e) => setDrStatus(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#FF6B00]"
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
                <label className="block font-semibold text-slate-600 mb-1">Advice</label>
                <select
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#FF6B00]"
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
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
              <Button 
                onClick={() => { setDate(""); setPlace(""); setDrStatus(""); setAdvice(""); setGender(""); }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 h-8 text-xs rounded-lg px-4"
              >
                Clear Filters
              </Button>
              <Button 
                onClick={handleExportCSV}
                disabled={exporting}
                className="bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white font-bold h-8 text-xs rounded-lg px-5 flex items-center gap-1 shadow-sm"
              >
                {exporting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export CSV Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Report Insights Card */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white">
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-800">Export Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs text-slate-600">
            <div className="space-y-2">
              <p>• Generated files strictly follow **Sankara Eye Hospital** compliance norms.</p>
              <p>• Patient demographics, diabetes duration, fundus photography quality ratings, and GPS location tags are bundled in the output columns.</p>
              <p>• Data is structured as a standard CSV format fully compatible with Microsoft Excel and Google Sheets.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
