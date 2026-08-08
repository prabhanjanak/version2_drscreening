import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, Eye, Edit2, Trash2, Calendar, MapPin, 
  Phone, User, ShieldAlert, CheckCircle, ChevronRight,
  Download, Printer, Filter, Grid, List, RefreshCw, Upload, Camera,
  Building, Sparkles, Activity, FileText, Check, X
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
  alternatePhone?: string | null;
  referralSource?: string | null;
  diabetesDuration: string;
  diabetesMeasureType?: string | null;
  diabetesMeasureValue?: string | null;
  bloodPressure?: string;
  drStatus: string;
  hasCataract?: string | null;
  cataractPlanning?: string | null;
  fundusCaptured?: boolean;
  fundusNotCapturedReason?: string | null;
  advice: string;
  imagePath: string;
  imageQuality: string;
  referralStatus: string;
  referToBaseHospital?: boolean;
  baseHospitalRemarks?: string | null;
  visitedBaseHospital?: boolean;
  baseHospitalVisitDate?: string | null;
  baseHospitalVisitOutcome?: string | null;
  baseHospitalNotes?: string | null;
  referredToGiftOfVision?: boolean;
  giftOfVisionNotes?: string | null;
  govtSchemes?: string[] | null;
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

const BASE_OUTCOMES = [
  "Laser Photocoagulation (PRP / Focal) Completed",
  "Intravitreal Anti-VEGF Injection Administered",
  "Vitrectomy Surgical Procedure",
  "Cataract Surgery (Phacoemulsification + Foldable IOL)",
  "Medical Management & Glycemic Control Advised",
  "Scheduled for 3-Month Follow-Up"
];

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
  
  const [selectedCampCode, setSelectedCampCode] = useState<string | null>(null);
  const [campSearch, setCampSearch] = useState("");

  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchDrStatus, setSearchDrStatus] = useState("");
  const [searchReferral, setSearchReferral] = useState("");
  const [searchCataract, setSearchCataract] = useState("");
  const [searchBaseHospital, setSearchBaseHospital] = useState("");
  const [searchGiftOfVision, setSearchGiftOfVision] = useState("");
  const [searchDate, setSearchDate] = useState("");

  const [activeBasePatient, setActiveBasePatient] = useState<PatientRecord | null>(null);
  const [baseOutcome, setBaseOutcome] = useState("");
  const [baseNotes, setBaseNotes] = useState("");
  const [isSavingBase, setIsSavingBase] = useState(false);

  // Fundus Image Upload Modal State & High-Res Full Image Fit
  const [uploadModalPatient, setUploadModalPatient] = useState<PatientRecord | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadingFundus, setIsUploadingFundus] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const compressFundusImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          let width = img.width;
          let height = img.height;
          // Keep high resolution up to 2800px max dimension without distortion
          const maxDim = 2800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          }, "image/jpeg", 0.92);
        };
      };
    });
  };

  const handleFundusFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const optimized = await compressFundusImage(file);
    setUploadFile(optimized);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(optimized);
  };

  const handleSaveFundusUpload = async () => {
    if (!uploadModalPatient || (!uploadFile && !uploadPreview)) return;
    setIsUploadingFundus(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      let remoteImagePath = uploadPreview || "";

      if (uploadFile) {
        const formData = new FormData();
        formData.append("image", uploadFile);
        const imgRes = await fetch("/api/patients/upload-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (!imgRes.ok) throw new Error("Image upload failed");
        const imgData = await imgRes.json();
        remoteImagePath = imgData.imagePath;
      }

      const updateRes = await fetch(`/api/patients/${uploadModalPatient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          imagePath: remoteImagePath,
          fundusCaptured: true,
          fundusNotCapturedReason: null
        })
      });

      if (!updateRes.ok) throw new Error("Failed to link fundus image to patient");
      const updated = await updateRes.json();

      setPatients(prev => prev.map(p => p.id === updated.id ? { ...p, imagePath: remoteImagePath, fundusCaptured: true } : p));
      setAllPatients(prev => prev.map(p => p.id === updated.id ? { ...p, imagePath: remoteImagePath, fundusCaptured: true } : p));

      setUploadModalPatient(null);
      setUploadFile(null);
      setUploadPreview(null);

      toast({
        title: "Fundus Image Uploaded! 📸",
        description: `High-resolution retinal image saved and fitted properly for ${updated.name}.`
      });
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingFundus(false);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const placesRes = await fetch("/api/screening-places", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (placesRes.ok) {
        const data = await placesRes.json();
        setPlaces(data);
      }
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
      if (searchCataract) queryParams.append("hasCataract", searchCataract);
      if (searchBaseHospital === "true") queryParams.append("visitedBaseHospital", "true");
      if (searchGiftOfVision === "true") queryParams.append("referredToGiftOfVision", "true");
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
  }, [selectedCampCode, searchName, searchPhone, searchDrStatus, searchReferral, searchCataract, searchBaseHospital, searchGiftOfVision, searchDate]);

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

  const handleSaveBaseVisit = async () => {
    if (!activeBasePatient) return;
    setIsSavingBase(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/patients/${activeBasePatient.id}/base-visit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          visitedBaseHospital: true,
          baseHospitalVisitDate: new Date().toISOString().split("T")[0],
          baseHospitalVisitOutcome: baseOutcome,
          baseHospitalNotes: baseNotes
        })
      });
      if (!res.ok) throw new Error("Failed to record base hospital visit");
      const updated = await res.json();
      setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
      setActiveBasePatient(null);
      toast({ 
        title: "Base Hospital Visit Recorded! 🏥", 
        description: `Marked ${updated.name} as visited Base Hospital.` 
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingBase(false);
    }
  };

  const filteredCamps = places.filter(place => 
    place.name.toLowerCase().includes(campSearch.toLowerCase()) ||
    place.shortCode.toLowerCase().includes(campSearch.toLowerCase()) ||
    (place.district && place.district.toLowerCase().includes(campSearch.toLowerCase()))
  );

  const selectedCampName = places.find(p => p.shortCode === selectedCampCode)?.name || selectedCampCode;

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
                        <p className="text-[10px] text-slate-400 font-mono">Code: {place.shortCode} • Date: {place.campDate || (place.createdAt ? new Date(place.createdAt).toISOString().split("T")[0] : "Active")}</p>
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

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setSelectedCampCode(null)}
            className="h-8 text-xs font-semibold border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100"
          >
            ← Back to Camps
          </Button>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">{selectedCampName}</h2>
            <p className="text-xs text-slate-500 font-mono">Camp Code: <strong className="text-[#FF6B00]">{selectedCampCode}</strong> • {patients.length} records</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={async () => {
              if (!selectedCampCode) return;
              try {
                const token = localStorage.getItem("vision2020_token");
                const queryParams = new URLSearchParams();
                queryParams.append("place", selectedCampCode);
                if (searchName) queryParams.append("search", searchName);
                if (searchPhone) queryParams.append("phone", searchPhone);
                if (searchDrStatus) queryParams.append("status", searchDrStatus);

                const res = await fetch(`/api/patients-export?${queryParams.toString()}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Failed to export camp patients");

                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `DRSMS_Patients_${selectedCampCode}_${new Date().toISOString().split("T")[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                toast({ title: "Camp Export Ready! 📊", description: `Exported patient list with all typed advice for camp ${selectedCampCode}.` });
              } catch (err: any) {
                toast({ title: "Export Failed", description: err.message, variant: "destructive" });
              }
            }}
            variant="outline"
            className="h-8 text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-[#FF6B00]" /> Export CSV
          </Button>

          {((user?.userType as string) === "field_user") && (
            <Link href="/patients/new" className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white rounded-lg text-xs font-semibold shadow-xs">
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

      <Card className="rounded-xl border border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[#FF6B00]" />
              <span>Comprehensive Multi-Field Filter & Search</span>
            </div>
            <span className="text-[10px] text-slate-400">Showing {patients.length} matching patients</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Name / Unique ID"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full pl-8 text-xs border border-slate-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Phone (Primary / Alt)"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="w-full pl-8 text-xs border border-slate-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>

            <select
              value={searchDrStatus}
              onChange={(e) => setSearchDrStatus(e.target.value)}
              className="text-xs border border-slate-300 p-2 rounded-lg bg-white font-medium"
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

            <select
              value={searchCataract}
              onChange={(e) => setSearchCataract(e.target.value)}
              className="text-xs border border-amber-300 p-2 rounded-lg bg-amber-50/50 font-bold text-amber-900"
            >
              <option value="">All Cataract</option>
              <option value="Immature Cataract">Immature Cataract</option>
              <option value="Mature Cataract">Mature Cataract</option>
              <option value="Hypermature Cataract">Hypermature Cataract</option>
              <option value="None">No Cataract (None)</option>
            </select>

            <select
              value={searchBaseHospital}
              onChange={(e) => setSearchBaseHospital(e.target.value)}
              className="text-xs border border-red-300 p-2 rounded-lg bg-red-50/50 font-bold text-red-900"
            >
              <option value="">All Base Status</option>
              <option value="true">Visited Base Hospital ✓</option>
            </select>

            <select
              value={searchGiftOfVision}
              onChange={(e) => setSearchGiftOfVision(e.target.value)}
              className="text-xs border border-emerald-300 p-2 rounded-lg bg-emerald-50/50 font-bold text-emerald-900"
            >
              <option value="">All Schemes</option>
              <option value="true">Gift of Vision Only 🎁</option>
            </select>

            <input 
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="text-xs border border-slate-300 p-2 rounded-lg bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
            <Button 
              onClick={() => { 
                setSearchName(""); setSearchPhone(""); setSearchDrStatus(""); 
                setSearchReferral(""); setSearchCataract(""); setSearchBaseHospital(""); 
                setSearchGiftOfVision(""); setSearchDate(""); 
              }}
              variant="outline"
              className="text-slate-600 text-xs px-3 h-7 rounded-lg"
            >
              Reset Filters
            </Button>
            <Button 
              onClick={() => fetchPatientsForCamp(selectedCampCode)}
              className="bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs px-4 h-7 rounded-lg font-bold"
            >
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

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
          <p className="text-xs text-slate-400 max-w-sm">No screening records matching the filters were found for camp {selectedCampCode}.</p>
        </Card>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patients.map((p) => (
            <Card key={p.id} className="rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden bg-white">
              <div className="p-4 flex gap-4">
                {renderPatientAvatar(p)}

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-extrabold text-slate-900 truncate text-sm flex items-center gap-1.5">
                        {p.name}
                        {p.referredToGiftOfVision && (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-300">
                            Gift of Vision
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] font-mono text-slate-400 font-bold">{p.uniqueId}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${DR_COLORS[p.drStatus] || "bg-slate-100"}`}>
                      {p.drStatus}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span>{p.age} Yrs • {p.gender}</span>
                    <span className="flex items-center gap-1 font-mono font-semibold">
                      <Phone className="h-3 w-3 text-slate-400" /> {p.phone}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px]">
                    {p.diabetesMeasureValue && (
                      <span className="bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                        {p.diabetesMeasureType || "GRBS"}: {p.diabetesMeasureValue}
                      </span>
                    )}
                    {p.hasCataract && p.hasCataract !== "None" && (
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
                        👁️ {p.hasCataract}
                      </span>
                    )}
                    {p.visitedBaseHospital && (
                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">
                        Visited Base ✓
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 truncate">
                    📢 Source: <strong className="text-slate-800">{p.referralSource || "ASHA Outreach"}</strong>
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex justify-between items-center text-xs">
                <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                  Advice: <strong className="text-slate-800">{p.advice}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={() => {
                      setUploadModalPatient(p);
                      setUploadPreview(p.imagePath && !p.imagePath.includes("no_fundus_photo") && !p.imagePath.includes("placeholder") ? p.imagePath : null);
                      setUploadFile(null);
                    }}
                    className={`h-7 text-[10px] font-black px-2.5 rounded-lg flex items-center gap-1 shadow-2xs transition-all ${
                      p.imagePath && !p.imagePath.includes("no_fundus_photo") && !p.imagePath.includes("placeholder")
                        ? "bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white"
                        : "bg-[#FF6B00] hover:bg-orange-600 text-white animate-pulse"
                    }`}
                  >
                    <Camera className="h-3 w-3" />
                    {p.imagePath && !p.imagePath.includes("no_fundus_photo") && !p.imagePath.includes("placeholder")
                      ? "Photo 📸"
                      : "Upload Fundus"}
                  </Button>

                  <Button
                    onClick={() => {
                      setActiveBasePatient(p);
                      setBaseOutcome(p.baseHospitalVisitOutcome || "");
                      setBaseNotes(p.baseHospitalNotes || "");
                    }}
                    variant="outline"
                    className={`h-7 text-[10px] font-bold px-2 rounded-md ${
                      p.visitedBaseHospital ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-white text-rose-700 border-rose-300 hover:bg-rose-50"
                    }`}
                  >
                    <Building className="h-3 w-3 mr-0.5" />
                    {p.visitedBaseHospital ? "Visited ✓" : "Base Visit"}
                  </Button>

                  <Link href={`/patients/${p.id}`} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                  {(user?.userType === "super_admin" || (user?.userType as string) === "field_user") && (
                    <Link href={`/patients/${p.id}/edit`} className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
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
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold text-slate-700">
                <th className="p-3.5">Unique ID</th>
                <th className="p-3.5">Patient Name</th>
                <th className="p-3.5">Age/Gender</th>
                <th className="p-3.5">Mobile</th>
                <th className="p-3.5">Referral Source</th>
                <th className="p-3.5">GRBS / Glucose</th>
                <th className="p-3.5">DR Stage</th>
                <th className="p-3.5">Cataract</th>
                <th className="p-3.5">Base Hospital</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/40">
                  <td className="p-3.5 font-mono font-bold text-[#FF6B00]">{p.uniqueId}</td>
                  <td className="p-3.5">
                    <p className="font-extrabold text-slate-900">{p.name}</p>
                    {p.referredToGiftOfVision && (
                      <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 rounded">
                        Gift of Vision
                      </span>
                    )}
                  </td>
                  <td className="p-3.5">{p.age} Yrs / {p.gender}</td>
                  <td className="p-3.5 font-mono">{p.phone}</td>
                  <td className="p-3.5 font-medium text-slate-600">{p.referralSource || "ASHA Outreach"}</td>
                  <td className="p-3.5">
                    {p.diabetesMeasureValue ? (
                      <span className="font-black text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {p.diabetesMeasureValue}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${DR_COLORS[p.drStatus] || "bg-slate-100"}`}>
                      {p.drStatus}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {p.hasCataract && p.hasCataract !== "None" ? (
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {p.hasCataract}
                      </span>
                    ) : <span className="text-slate-400">None</span>}
                  </td>
                  <td className="p-3.5">
                    {p.visitedBaseHospital ? (
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Visited ✓
                      </span>
                    ) : p.referToBaseHospital ? (
                      <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Referred
                      </span>
                    ) : <span className="text-slate-400">Not Flagged</span>}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      {/* PROMINENT ORANGE UPLOAD FUNDUS IMAGE BUTTON ON RIGHT SIDE */}
                      <Button
                        onClick={() => {
                          setUploadModalPatient(p);
                          setUploadPreview(p.imagePath && !p.imagePath.includes("no_fundus_photo") && !p.imagePath.includes("placeholder") ? p.imagePath : null);
                          setUploadFile(null);
                        }}
                        className={`h-7 text-[10px] font-black px-2.5 rounded-lg flex items-center gap-1 shadow-2xs transition-all ${
                          p.imagePath && !p.imagePath.includes("no_fundus_photo") && !p.imagePath.includes("placeholder")
                            ? "bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white"
                            : "bg-[#FF6B00] hover:bg-orange-600 text-white animate-pulse"
                        }`}
                      >
                        <Camera className="h-3 w-3" />
                        {p.imagePath && !p.imagePath.includes("no_fundus_photo") && !p.imagePath.includes("placeholder")
                          ? "View / Change Photo"
                          : "Upload Fundus Image"}
                      </Button>

                      <Button
                        onClick={() => {
                          setActiveBasePatient(p);
                          setBaseOutcome(p.baseHospitalVisitOutcome || "");
                          setBaseNotes(p.baseHospitalNotes || "");
                        }}
                        variant="outline"
                        className="h-7 text-[10px] font-bold px-2 rounded-md border-slate-200"
                      >
                        <Building className="h-3 w-3 mr-0.5" />
                        {p.visitedBaseHospital ? "Outcome" : "Base"}
                      </Button>
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

      {/* DEDICATED HIGH-RESOLUTION FUNDUS IMAGE UPLOAD & FIT MODAL */}
      {uploadModalPatient && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <Card className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white p-5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Camera className="h-5 w-5" /> Retinal Fundus Photo Upload
                  </CardTitle>
                  <CardDescription className="text-orange-100 text-xs mt-0.5">
                    {uploadModalPatient.name} ({uploadModalPatient.uniqueId}) • Phone: {uploadModalPatient.phone}
                  </CardDescription>
                </div>
                <button onClick={() => setUploadModalPatient(null)} className="text-orange-100 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              <div className="border-2 border-dashed border-orange-200 bg-orange-50/40 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-3">
                {uploadPreview ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 p-1 shadow-md max-w-md w-full">
                      <img
                        src={uploadPreview}
                        alt="High Resolution Fundus Preview"
                        className="w-full h-64 object-contain rounded-lg cursor-pointer transition-transform hover:scale-[1.02]"
                        onClick={() => setFullscreenImage(uploadPreview)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUploadFile(null);
                          setUploadPreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-full shadow-md"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        Full Resolution Automatically Fitted ✓
                      </span>
                      <Button
                        type="button"
                        onClick={() => document.getElementById("modal-file-input")?.click()}
                        variant="outline"
                        className="h-7 text-[10px] font-bold border-slate-300 bg-white"
                      >
                        Change File
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-[#FF6B00]">
                      <Camera className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Select or Capture High-Resolution Fundus Image</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        High-definition retinal images are automatically scaled to full resolution and fitted without distortion.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center pt-1">
                      <Button
                        type="button"
                        onClick={() => document.getElementById("modal-camera-input")?.click()}
                        className="bg-[#FF6B00] hover:bg-orange-600 text-white font-bold h-9 text-xs rounded-xl flex items-center gap-1.5 shadow-2xs"
                      >
                        <Camera className="h-4 w-4" /> Direct Camera Capture
                      </Button>
                      <Button
                        type="button"
                        onClick={() => document.getElementById("modal-file-input")?.click()}
                        className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold h-9 text-xs rounded-xl flex items-center gap-1.5 shadow-2xs"
                      >
                        <Upload className="h-4 w-4" /> Choose from Gallery / Files
                      </Button>
                    </div>
                  </>
                )}

                <input
                  id="modal-camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFundusFileSelect}
                />
                <input
                  id="modal-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFundusFileSelect}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setUploadModalPatient(null)}
                  variant="outline"
                  className="flex-1 text-xs h-9 rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveFundusUpload}
                  disabled={isUploadingFundus || !uploadPreview}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white text-xs h-9 rounded-xl font-bold shadow-md"
                >
                  {isUploadingFundus ? "Saving Image..." : "Save High-Res Fundus Image"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Base Hospital Modal */}
      {activeBasePatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <Card className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Building className="h-5 w-5" /> Base Hospital Visit Outcome
                  </CardTitle>
                  <CardDescription className="text-rose-100 text-xs mt-0.5">
                    {activeBasePatient.name} ({activeBasePatient.uniqueId}) • Phone: {activeBasePatient.phone}
                  </CardDescription>
                </div>
                <button onClick={() => setActiveBasePatient(null)} className="text-rose-100 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                <p className="text-xs font-bold text-rose-950">
                  Toggle: Patient Visited Sankara Eye Hospital (Base)
                </p>
                <p className="text-[10px] text-rose-700 mt-0.5">
                  Confirm patient arrival and select the tertiary surgical or laser outcome performed at the base hospital.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tertiary Outcome / Procedure Done at Base *
                </label>
                <select
                  value={baseOutcome}
                  onChange={(e) => setBaseOutcome(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-xl bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Select Base Hospital Outcome...</option>
                  {BASE_OUTCOMES.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Base Hospital Clinical Notes & Follow-Up Advice
                </label>
                <textarea
                  rows={3}
                  value={baseNotes}
                  onChange={(e) => setBaseNotes(e.target.value)}
                  placeholder="Enter surgical notes, post-op vision, laser quadrants treated, or next appointment date..."
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-xl bg-white outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setActiveBasePatient(null)}
                  variant="outline"
                  className="flex-1 text-xs h-9 rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveBaseVisit}
                  disabled={isSavingBase || !baseOutcome}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-rose-600 hover:to-red-700 text-white text-xs h-9 rounded-xl font-bold shadow-md"
                >
                  {isSavingBase ? "Saving..." : "Save Base Visit Outcome"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fullscreen HD Fundus Viewer */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <button 
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 text-white p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-full shadow-lg"
          >
            <X className="h-6 w-6" />
          </button>
          <img src={fullscreenImage} alt="Fullscreen Fundus HD" className="max-w-[95vw] max-h-[92vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
