import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Truck, Calendar, MapPin, ExternalLink, Search, RefreshCw, Printer, ShieldCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import sankaraTextBanner from "@assets/sankara_eye_icon.png";

interface CampSchedule {
  id: number;
  name: string;
  shortCode: string;
  district: string;
  state: string;
  taluk?: string;
  pincode?: string;
  sankaraUnit?: string;
  status: string;
  latitude?: string;
  longitude?: string;
  createdAt: string;
}

export default function DrsmsFacilitySchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [camps, setCamps] = useState<CampSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All");

  const token = localStorage.getItem("vision2020_token");

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/screening-places", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load camp dispatch schedule");
      const data = await res.json();
      setCamps(data);
      localStorage.setItem("cached_camps_schedule", JSON.stringify(data));
    } catch (err: any) {
      const cached = localStorage.getItem("cached_camps_schedule");
      if (cached) {
        setCamps(JSON.parse(cached));
        toast({ title: "Offline Mode", description: "Loaded saved schedule from local cache." });
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const districts = Array.from(new Set(camps.map(c => c.district).filter(Boolean)));

  const filteredCamps = camps.filter(c => {
    const matchesQuery = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (c.taluk && c.taluk.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         c.district.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDistrict = selectedDistrict === "All" || c.district === selectedDistrict;
    return matchesQuery && matchesDistrict;
  });

  const printDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      {/* Dynamic CSS for Clean Print Layout */}
      <style>{`
        @media print {
          /* Hide non-print UI */
          aside, nav, header, button, input, select, .no-print {
            display: none !important;
          }

          body, main, div {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .print-header {
            display: block !important;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }

          .print-table-container {
            border: 1px solid #000 !important;
            border-radius: 0 !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
          }

          th, td {
            border: 1px solid #666 !important;
            padding: 6px 8px !important;
          }

          th {
            background-color: #f1f5f9 !important;
            color: #000 !important;
            font-weight: bold !important;
          }

          .handwriting-col {
            width: 130px !important;
            min-width: 130px !important;
            height: 38px !important;
            background: #fff !important;
          }
        }

        .print-header {
          display: none;
        }
      `}</style>

      {/* Printable Header (Visible only during printing) */}
      <div className="print-header">
        <div className="flex justify-between items-center mb-2">
          <img src={sankaraTextBanner} alt="Sankara Eye Foundation" className="h-10" />
          <div className="text-right text-xs">
            <p className="font-bold">SANKARA EYE HOSPITAL NETWORK</p>
            <p className="text-slate-600">Unit: {user?.assignedTrack || "Shimoga Unit"}</p>
            <p className="text-slate-500">Date Printed: {printDate}</p>
          </div>
        </div>
        <h2 className="text-lg font-extrabold uppercase text-center tracking-wider mt-2">
          Outreach Camp Transport & Vehicle Dispatch Schedule
        </h2>
        <p className="text-center text-xs text-slate-600 font-semibold">
          Facility Manager: {user?.name} ({(user as any)?.empId || "006704"})
        </p>
      </div>

      {/* On-Screen Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-[#FF6B00]" />
            <h1 className="text-2xl font-extrabold text-slate-900">Facility & Transport Dispatch Schedule</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Single-page logistics view detailing <strong>which camp is scheduled on which date</strong>, location, district, state, and empty columns for vehicle assignment handwriting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={fetchSchedule} variant="outline" className="text-xs h-9 bg-white">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 font-bold shadow-sm">
            <Printer className="h-4 w-4 mr-1" /> Print Schedule
          </Button>
        </div>
      </div>

      {/* User Info Banner */}
      <Card className="bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white rounded-xl shadow-sm border-none p-4 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded">Facility Manager View</span>
            <h2 className="text-base font-bold mt-1">Facility Manager: {user?.name} ({(user as any)?.empId || "Facility Staff"})</h2>
            <p className="text-xs text-orange-100">Assigned Unit: {user?.assignedTrack || "Sankara Eye Hospital Shimoga"}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-300" /> Print-Ready Vehicle Columns Included
          </div>
        </div>
      </Card>

      {/* Search & District Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs no-print">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search camp name, code, taluk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">District Filter:</span>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg p-2 bg-white font-bold text-slate-700 outline-none focus:ring-1 focus:ring-[#FF6B00]"
          >
            <option value="All">All Districts</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dispatch Schedule Table */}
      <Card className="rounded-xl border border-slate-200 shadow-xs bg-white overflow-hidden print-table-container">
        <CardHeader className="p-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between no-print">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">Outreach Camp Transport Schedule</CardTitle>
            <CardDescription className="text-[11px]">Includes empty physical handwriting columns for Vehicle Type & Vehicle Number.</CardDescription>
          </div>
          <span className="text-xs font-bold bg-orange-100 text-[#FF6B00] px-2.5 py-1 rounded-full">
            {filteredCamps.length} Camps Scheduled
          </span>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading transport schedule...</div>
          ) : filteredCamps.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No camps matched your filter criteria.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3 pl-4 border-r border-slate-200">Date / Code</th>
                  <th className="p-3 border-r border-slate-200">Camp Name</th>
                  <th className="p-3 border-r border-slate-200">State & District</th>
                  <th className="p-3 border-r border-slate-200">Taluk / Location</th>
                  <th className="p-3 border-r border-slate-200">Responsible Unit</th>
                  {/* Empty Columns for Post-Print Handwriting */}
                  <th className="p-3 border-r border-slate-200 bg-amber-50/60 text-amber-900 font-extrabold w-32">
                    Vehicle Type<br /><span className="text-[8px] font-normal text-amber-700">(Bus/Tempo/Van)</span>
                  </th>
                  <th className="p-3 border-r border-slate-200 bg-amber-50/60 text-amber-900 font-extrabold w-36">
                    Vehicle Number / Driver<br /><span className="text-[8px] font-normal text-amber-700">(Reg No / Phone)</span>
                  </th>
                  <th className="p-3 text-right pr-4 no-print">GPS / Map</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                {filteredCamps.map((camp) => {
                  const dateStr = camp.createdAt ? new Date(camp.createdAt).toISOString().split("T")[0] : "Scheduled";
                  const mapsLink = camp.latitude && camp.longitude
                    ? `https://maps.google.com/?q=${camp.latitude},${camp.longitude}`
                    : `https://maps.google.com/?q=${encodeURIComponent(camp.name + " " + camp.district)}`;

                  return (
                    <tr key={camp.id} className="hover:bg-orange-50/30 transition-colors border-b border-slate-200">
                      <td className="p-3 pl-4 whitespace-nowrap border-r border-slate-200">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Calendar className="h-3.5 w-3.5 text-[#FF6B00] no-print" /> {dateStr}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">Code: {camp.shortCode}</span>
                      </td>

                      <td className="p-3 font-bold text-slate-900 max-w-xs border-r border-slate-200">
                        {camp.name}
                      </td>

                      <td className="p-3 border-r border-slate-200">
                        <div className="font-semibold text-slate-800">{camp.district}</div>
                        <span className="text-[10px] text-slate-500">{camp.state}</span>
                      </td>

                      <td className="p-3 border-r border-slate-200">
                        <div className="font-semibold text-slate-800">{camp.taluk || "Central Taluk"}</div>
                        <span className="text-[10px] text-slate-500">Pincode: {camp.pincode || "N/A"}</span>
                      </td>

                      <td className="p-3 text-slate-700 font-semibold max-w-xs border-r border-slate-200">
                        {camp.sankaraUnit || user?.assignedTrack || "Sankara Eye Hospital Shimoga"}
                      </td>

                      {/* Empty Handwriting Box Column 1: Vehicle Type */}
                      <td className="p-3 border-r border-slate-300 handwriting-col bg-white">
                        <div className="w-full h-8 border border-dashed border-slate-300 rounded-md"></div>
                      </td>

                      {/* Empty Handwriting Box Column 2: Vehicle Reg No / Driver */}
                      <td className="p-3 border-r border-slate-300 handwriting-col bg-white">
                        <div className="w-full h-8 border border-dashed border-slate-300 rounded-md"></div>
                      </td>

                      <td className="p-3 text-right pr-4 whitespace-nowrap no-print">
                        <a
                          href={mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors"
                        >
                          <MapPin className="h-3 w-3" /> Map <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
