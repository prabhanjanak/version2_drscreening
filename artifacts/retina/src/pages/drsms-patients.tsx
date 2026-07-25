import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, Eye, Edit2, Trash2, Calendar, MapPin, 
  Phone, User, ShieldAlert, CheckCircle, ChevronRight,
  Download, Printer, Filter, Grid, List, RefreshCw, Upload
} from "lucide-react";

interface PatientRecord {
  id: number;
  uniqueId: string;
  date: string;
  screeningPlaceCode: string;
  serialNumber: number;
  name: string;
  age: number;
  gender: string;
  address?: string;
  phone: string;
  diabetesDuration: string;
  bloodPressure?: string;
  drStatus: string;
  advice: string;
  imagePath: string;
  imageQuality: string;
  referralStatus: string;
  referToBaseHospital?: boolean;
  createdAt: string;
}

const DR_COLORS: Record<string, string> = {
  "No DR": "bg-slate-100 text-slate-700 border-slate-200",
  "Mild NPDR": "bg-amber-50 text-amber-700 border-amber-200",
  "Moderate NPDR": "bg-orange-50 text-[#FF6B00] border-orange-200",
  "Severe NPDR": "bg-red-50 text-red-700 border-red-200",
  "PDR": "bg-rose-100 text-rose-800 border-rose-200",
  "Macular Edema": "bg-purple-50 text-purple-700 border-purple-200",
  "Ungradable": "bg-gray-100 text-gray-500 border-gray-200",
  "Refer": "bg-red-100 text-red-800 border-red-200 border-dashed"
};

const REFERRAL_COLORS: Record<string, string> = {
  "Referred": "bg-blue-100 text-blue-800",
  "Visited": "bg-yellow-100 text-yellow-800",
  "Treated": "bg-emerald-100 text-emerald-800",
  "Follow-up": "bg-indigo-100 text-indigo-800"
};

const getInitials = (name: string) => {
  if (!name) return "PT";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const renderPatientAvatar = (p: PatientRecord) => {
  const hasValidImage = p.imagePath && 
    p.imagePath.length > 5 && 
    !p.imagePath.includes("no_fundus_photo") && 
    !p.imagePath.includes("placeholder") && 
    !p.imagePath.includes("Pending") &&
    !p.imagePath.includes("undefined");

  if (hasValidImage) {
    return (
      <div className="h-16 w-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-xs bg-slate-100 relative group flex items-center justify-center">
        <img
          src={p.imagePath}
          alt={p.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  const initials = getInitials(p.name);
  const isFemale = p.gender?.toLowerCase() === "female";

  return (
    <div
      className={`h-16 w-16 rounded-xl shrink-0 flex flex-col items-center justify-center border shadow-xs relative overflow-hidden select-none ${
        isFemale
          ? "bg-gradient-to-br from-rose-500 to-pink-600 border-rose-300 text-white"
          : "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white"
      }`}
    >
      <Eye className="absolute -bottom-2 -right-2 h-10 w-10 text-white/10 pointer-events-none" />
      <span className="text-base font-extrabold tracking-wider leading-none">{initials}</span>
      <span className="text-[9px] font-bold text-orange-400 mt-1 uppercase tracking-widest leading-none">SEH</span>
    </div>
  );
};

export default function DrsmsPatients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [allPatients, setAllPatients] = useState<PatientRecord[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  
  // Selected camp state
  const [selectedCampCode, setSelectedCampCode] = useState<string | null>(null);

  // Camp search query
  const [campSearch, setCampSearch] = useState("");

  // Filters state
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchDrStatus, setSearchDrStatus] = useState("");
  const [searchReferral, setSearchReferral] = useState("");
  const [searchDate, setSearchDate] = useState("");

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      
      // 1. Fetch all places
      const placesRes = await fetch("/api/screening-places", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (placesRes.ok) {
        const data = await placesRes.json();
        setPlaces(data);
      }

      // 2. Fetch all patients to calculate counts
      const patientsRes = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setAllPatients(data);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientsForCamp = async (campCode: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const queryParams = new URLSearchParams();
      queryParams.append("place", campCode);
      if (searchName) queryParams.append("name", searchName);
      if (searchPhone) queryParams.append("phone", searchPhone);
      if (searchDrStatus) queryParams.append("status", searchDrStatus);
      if (searchReferral) queryParams.append("referralStatus", searchReferral);
      if (searchDate) queryParams.append("date", searchDate);

      const res = await fetch(`/api/patients?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load patient records");
      const data = await res.json();
      setPatients(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCampCode) {
      fetchPatientsForCamp(selectedCampCode);
    }
  }, [selectedCampCode, searchName, searchPhone, searchDrStatus, searchReferral, searchDate]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this screening record?")) return;
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/patients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete record");
      toast({ title: "Success", description: "Record deleted successfully" });
      setPatients(prev => prev.filter(p => p.id !== id));
      setAllPatients(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Filter camps list based on query
  const filteredCamps = places.filter(place => 
    place.name.toLowerCase().includes(campSearch.toLowerCase()) ||
    place.shortCode.toLowerCase().includes(campSearch.toLowerCase()) ||
    place.district.toLowerCase().includes(campSearch.toLowerCase())
  );

  const selectedCampName = places.find(p => p.shortCode === selectedCampCode)?.name || selectedCampCode;

  // ──── VIEW 1: CAMP SELECTION ────
  if (!selectedCampCode) {
    return (
      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patient Screening Records</h1>
            <p className="text-sm text-slate-500">Select a campsite to browse individual screened patient lists.</p>
          </div>
          {((user?.userType as string) === "field_user") && (
            <Link href="/patients/new" className="px-4 py-2 bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white rounded-lg text-sm font-semibold shadow-xs">
              + New Screening
            </Link>
          )}
        </div>

        {/* Camp Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search camp by name, code or district..."
            value={campSearch}
            onChange={(e) => setCampSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-white shadow-xs"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredCamps.length === 0 ? (
          <Card className="rounded-xl border border-slate-200/80 p-8 text-center flex flex-col items-center gap-2">
            <MapPin className="h-10 w-10 text-slate-300" />
            <h3 className="font-bold text-slate-700">No Camps Found</h3>
            <p className="text-xs text-slate-400 max-w-sm">No camps found matching "{campSearch}". Try searching for another name or code.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCamps.map((place) => {
              const count = allPatients.filter(p => p.screeningPlaceCode === place.shortCode).length;
              return (
                <Card 
                  key={place.id} 
                  className="rounded-xl border border-slate-200 shadow-xs hover:border-[#FF6B00] hover:shadow-md transition-all duration-200 cursor-pointer bg-white group flex flex-col justify-between"
                  onClick={() => setSelectedCampCode(place.shortCode)}
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-slate-800 text-sm group-hover:text-[#FF6B00] transition-colors">{place.name}</h3>
                        <p className="text-[10px] text-slate-400 font-mono">Code: {place.shortCode}</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                        {place.placeType || "PHC"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">District</p>
                        <p className="font-semibold text-slate-700 truncate">{place.district}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">Taluk</p>
                        <p className="font-semibold text-slate-700 truncate">{place.taluk || "-"}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-slate-600 font-bold">
                        <span className="text-sm text-[#FF6B00]">{count}</span>
                        <span className="text-[11px] text-slate-500">Patients Screened</span>
                      </div>
                      <span className="text-[10px] font-extrabold text-[#FF6B00] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                        View Patients <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ──── VIEW 2: PATIENT LISTING FOR SPECIFIC CAMP ────
  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => {
              setSelectedCampCode(null);
              setSearchName("");
              setSearchPhone("");
              setSearchDrStatus("");
              setSearchReferral("");
              setSearchDate("");
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 mb-1"
          >
            &larr; Back to Camp List
          </button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate max-w-xl">
            {selectedCampName}
          </h1>
          <p className="text-xs text-slate-500">Patient screening index for camp code: <span className="font-mono text-slate-700 font-bold">{selectedCampCode}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {((user?.userType as string) === "field_user") && (
            <Link href="/patients/new" className="px-4 py-2 bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white rounded-lg text-sm font-semibold shadow-xs">
              + New Screening
            </Link>
          )}
          <div className="bg-white border border-slate-200 p-0.5 rounded-lg flex shadow-xs shrink-0">
            <button 
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "card" ? "bg-orange-100 text-[#FF6B00]" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-orange-100 text-[#FF6B00]" : "text-slate-500 hover:text-slate-800"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="rounded-xl border border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 border-b border-slate-100 pb-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Search & Filter Within Camp</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Name search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search Name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full pl-8 text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            {/* Phone search */}
            <div className="relative">
              <Phone className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search Phone"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="w-full pl-8 text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            {/* DR Status */}
            <select
              value={searchDrStatus}
              onChange={(e) => setSearchDrStatus(e.target.value)}
              className="text-xs border border-slate-300 p-2.5 rounded-lg bg-white"
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

            {/* Referral Status */}
            <select
              value={searchReferral}
              onChange={(e) => setSearchReferral(e.target.value)}
              className="text-xs border border-slate-300 p-2.5 rounded-lg bg-white"
            >
              <option value="">All Referrals</option>
              <option value="Referred">Referred</option>
              <option value="Visited">Visited</option>
              <option value="Treated">Treated</option>
              <option value="Follow-up">Follow-up</option>
            </select>

            {/* Date */}
            <input 
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="text-xs border border-slate-300 p-2.5 rounded-lg bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button 
              onClick={() => { setSearchName(""); setSearchPhone(""); setSearchDrStatus(""); setSearchReferral(""); setSearchDate(""); }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 h-8 rounded-lg"
            >
              Reset Filters
            </Button>
            <Button 
              onClick={() => fetchPatientsForCamp(selectedCampCode)}
              className="bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs px-4 h-8 rounded-lg"
            >
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main content list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <Card className="rounded-xl border border-slate-200/80 p-8 text-center flex flex-col items-center gap-2 bg-white">
          <ShieldAlert className="h-10 w-10 text-slate-300" />
          <h3 className="font-bold text-slate-700">No Patient Records Found</h3>
          <p className="text-xs text-slate-400 max-w-sm">No screening records matching the parameters were found for this camp.</p>
        </Card>
      ) : viewMode === "card" ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patients.map((p) => (
            <Card key={p.id} className="rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden bg-white">
              <div className="p-4 flex gap-4">
                {renderPatientAvatar(p)}

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-slate-800 truncate text-sm">{p.name}</h3>
                    <span className="text-[10px] font-mono text-slate-400">{p.uniqueId}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{p.age} Yrs • {p.gender}</span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {p.phone}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-orange-500" /> {p.screeningPlaceCode}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.date}</span>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2 items-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${DR_COLORS[p.drStatus] || "bg-slate-100"}`}>
                      {p.drStatus}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${REFERRAL_COLORS[p.referralStatus] || "bg-slate-100"}`}>
                      {p.referralStatus}
                    </span>
                    {p.referToBaseHospital && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-red-600 bg-red-50 border border-red-200">
                        Base Hosp.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex justify-between items-center text-xs">
                <span className="text-[10px] text-slate-400 truncate max-w-[150px]">Advice: {p.advice}</span>
                <div className="flex gap-1.5">
                  <Link href={`/patients/${p.id}`} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                  {(user?.userType === "super_admin" || (user?.userType as string) === "field_user") && (
                    <Link href={`/patients/${p.id}/edit`} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {user?.userType === "super_admin" && (
                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 bg-white border border-slate-200 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="p-4">Date</th>
                <th className="p-4">Unique ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Age/Gender</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Place</th>
                <th className="p-4">DR Status</th>
                <th className="p-4">Referral</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/40">
                  <td className="p-4">{p.date}</td>
                  <td className="p-4 font-mono font-semibold text-slate-500">{p.uniqueId}</td>
                  <td className="p-4 font-bold text-slate-900">{p.name}</td>
                  <td className="p-4">{p.age} Yrs / {p.gender}</td>
                  <td className="p-4">{p.phone}</td>
                  <td className="p-4">{p.screeningPlaceCode}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${DR_COLORS[p.drStatus] || "bg-slate-100"}`}>
                      {p.drStatus}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold ${REFERRAL_COLORS[p.referralStatus] || "bg-slate-100"}`}>
                        {p.referralStatus}
                      </span>
                      {p.referToBaseHospital && (
                        <span className="w-fit text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                          Base Hosp.
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1.5">
                      <Link href={`/patients/${p.id}`} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100 transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      {(user?.userType === "super_admin" || (user?.userType as string) === "field_user") && (
                        <Link href={`/patients/${p.id}/edit`} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100 transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      {user?.userType === "super_admin" && (
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 bg-white border border-slate-200 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
