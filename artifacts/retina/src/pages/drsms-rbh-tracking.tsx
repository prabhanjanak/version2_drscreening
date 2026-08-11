import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, Search, Eye, Phone, MapPin, Download, RefreshCw, 
  CheckCircle, Clock, ShieldAlert, Sparkles, Filter, Calendar, Camera, Upload, X, User, Users, Activity, FileText, Heart
} from "lucide-react";

interface PatientRecord {
  id: number;
  uniqueId: string;
  date: string;
  screeningPlaceCode: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  alternatePhone?: string | null;
  address?: string | null;
  drStatus: string;
  hasCataract?: string | null;
  cataractPlanning?: string | null;
  advice: string;
  referToBaseHospital?: boolean;
  baseHospitalRemarks?: string | null;
  remarks?: string | null;
  referralStatus: string;
  referralSource?: string | null;
  imagePath?: string | null;
  imageQuality?: string | null;
  visitedBaseHospital?: boolean;
  baseHospitalVisitDate?: string | null;
  baseHospitalVisitOutcome?: string | null;
  baseHospitalNotes?: string | null;
  referredToGiftOfVision?: boolean;
  giftOfVisionNotes?: string | null;
  govtSchemes?: string[] | null;
  createdAt: string;
}

const BASE_OUTCOMES = [
  "Laser Photocoagulation (PRP / Focal) Completed",
  "Intravitreal Anti-VEGF Injection Administered",
  "Vitrectomy Surgical Procedure Scheduled/Completed",
  "Cataract Surgery (Phacoemulsification + Foldable IOL)",
  "Medical Management & Glycemic Control Advised",
  "Routine Observation & 3-Month Follow-Up",
  "Deferred / Patient Not Fit for Surgery",
  "Other Tertiary Specialty Referral"
];

const DR_COLORS: Record<string, string> = {
  "No DR": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Mild NPDR": "bg-blue-50 text-blue-700 border-blue-200",
  "Moderate NPDR": "bg-amber-50 text-amber-700 border-amber-200",
  "Severe NPDR": "bg-orange-50 text-orange-700 border-orange-200",
  "PDR": "bg-red-50 text-red-700 border-red-200",
  "Macular Edema": "bg-purple-50 text-purple-700 border-purple-200",
  "Ungradable": "bg-slate-100 text-slate-700 border-slate-200",
  "Refer": "bg-rose-50 text-rose-700 border-rose-200",
};

export default function DrsmsRbhTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArrival, setFilterArrival] = useState<"all" | "visited" | "pending">("all");
  const [filterCamp, setFilterCamp] = useState("");
  const [filterDrStatus, setFilterDrStatus] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");
  const [filterGiftOfVision, setFilterGiftOfVision] = useState("");

  // Modal State for Base Hospital Outcome & Remarks
  const [activePatient, setActivePatient] = useState<PatientRecord | null>(null);
  const [visitedToggle, setVisitedToggle] = useState(true);
  const [visitDate, setVisitDate] = useState("");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fundus Image Upload in Modal
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

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

  const fetchRbhPatients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: PatientRecord[] = await res.json();
        // Filter for RBH (Refer to Base Hospital flagged or High-grade DR / Cataract referral)
        const rbhList = data.filter(p => 
          p.referToBaseHospital === true || 
          p.visitedBaseHospital === true ||
          ["Severe NPDR", "PDR", "Macular Edema", "Moderate NPDR", "Refer"].includes(p.drStatus) ||
          (p.hasCataract && p.hasCataract !== "None")
        );
        setPatients(rbhList);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
    fetchRbhPatients();
  }, []);

  const openOutcomeModal = (p: PatientRecord) => {
    setActivePatient(p);
    setVisitedToggle(p.visitedBaseHospital !== undefined ? p.visitedBaseHospital : true);
    setVisitDate(p.baseHospitalVisitDate || new Date().toISOString().split("T")[0]);
    setOutcome(p.baseHospitalVisitOutcome || "");
    setNotes(p.baseHospitalNotes || p.baseHospitalRemarks || "");
    setUploadPreview(p.imagePath && !p.imagePath.includes("placeholder") && !p.imagePath.includes("no_fundus_photo") ? p.imagePath : null);
    setUploadFile(null);
  };

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSaveOutcome = async () => {
    if (!activePatient) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      let remoteImagePath = activePatient.imagePath;

      if (uploadFile) {
        const formData = new FormData();
        formData.append("image", uploadFile);
        const imgRes = await fetch("/api/patients/upload-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          remoteImagePath = imgData.imagePath;
        }
      }

      const res = await fetch(`/api/patients/${activePatient.id}/base-visit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          visitedBaseHospital: visitedToggle,
          baseHospitalVisitDate: visitedToggle ? (visitDate || new Date().toISOString().split("T")[0]) : null,
          baseHospitalOutcome: visitedToggle ? outcome : null,
          baseHospitalNotes: notes,
          imagePath: remoteImagePath
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to update base hospital record");
      }

      const updated = await res.json();
      setPatients(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      setActivePatient(null);

      toast({
        title: "Base Hospital Record Updated! 🏥",
        description: `Logged visit outcome and remarks for ${updated.name}.`
      });
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered patient list
  const filteredPatients = patients.filter((p) => {
    if (filterArrival === "visited" && !p.visitedBaseHospital) return false;
    if (filterArrival === "pending" && p.visitedBaseHospital) return false;
    if (filterCamp && p.screeningPlaceCode !== filterCamp) return false;
    if (filterDrStatus && p.drStatus !== filterDrStatus) return false;
    if (filterOutcome && (!p.baseHospitalVisitOutcome || !p.baseHospitalVisitOutcome.includes(filterOutcome))) return false;
    if (filterGiftOfVision === "true" && !p.referredToGiftOfVision) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchId = p.uniqueId.toLowerCase().includes(q);
      const matchPhone = p.phone.includes(q) || (p.alternatePhone && p.alternatePhone.includes(q));
      const matchCamp = p.screeningPlaceCode.toLowerCase().includes(q);
      const matchNotes = (p.baseHospitalNotes && p.baseHospitalNotes.toLowerCase().includes(q)) || 
                         (p.baseHospitalRemarks && p.baseHospitalRemarks.toLowerCase().includes(q)) ||
                         (p.advice && p.advice.toLowerCase().includes(q));
      return matchName || matchId || matchPhone || matchCamp || matchNotes;
    }
    return true;
  });

  // KPI Summary calculations
  const totalRbh = patients.length;
  const visitedCount = patients.filter(p => p.visitedBaseHospital).length;
  const pendingCount = totalRbh - visitedCount;
  const surgicalInterventions = patients.filter(p => p.baseHospitalVisitOutcome && (
    p.baseHospitalVisitOutcome.includes("Laser") || 
    p.baseHospitalVisitOutcome.includes("Injection") || 
    p.baseHospitalVisitOutcome.includes("Surgery") ||
    p.baseHospitalVisitOutcome.includes("Vitrectomy")
  )).length;
  const giftOfVisionCount = patients.filter(p => p.referredToGiftOfVision).length;

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const headers = [
        "Unique ID", "Camp Date", "Camp Code", "Patient Name", "Age", "Gender", 
        "Primary Mobile", "Alternate Mobile", "Address", "Referral Source", "DR Diagnosis", 
        "Cataract Stage", "Cataract Plan", "Clinical Advice", "Gift of Vision", 
        "Visited Base Hospital", "Base Hospital Visit Date", "Tertiary Outcome / Procedure", "Base Hospital Remarks"
      ];

      const rows = filteredPatients.map(p => [
        `"${p.uniqueId}"`,
        `"${p.date}"`,
        `"${p.screeningPlaceCode}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        p.age,
        `"${p.gender}"`,
        `"${p.phone}"`,
        `"${p.alternatePhone || ""}"`,
        `"${(p.address || "").replace(/"/g, '""')}"`,
        `"${(p.referralSource || "ASHA Outreach").replace(/"/g, '""')}"`,
        `"${p.drStatus}"`,
        `"${p.hasCataract || "None"}"`,
        `"${(p.cataractPlanning || "").replace(/"/g, '""')}"`,
        `"${(p.advice || "").replace(/"/g, '""')}"`,
        p.referredToGiftOfVision ? "YES" : "NO",
        p.visitedBaseHospital ? "YES" : "NO",
        `"${p.baseHospitalVisitDate || ""}"`,
        `"${(p.baseHospitalVisitOutcome || "").replace(/"/g, '""')}"`,
        `"${(p.baseHospitalNotes || p.baseHospitalRemarks || "").replace(/"/g, '""')}"`
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Sankara_Base_Hospital_RBH_Tracking_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Export Successful! 📊", description: `Exported ${filteredPatients.length} RBH patient records.` });
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                RBH (Refer to Base Hospital) Patient Tracker
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Sankara Eye Hospital registration & tertiary clinic follow-up console. Track patient arrivals, procedures done, and doctor remarks.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button 
            onClick={fetchRbhPatients}
            variant="outline"
            className="h-9 text-xs font-bold px-3 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button 
            onClick={handleExportCSV}
            disabled={exporting}
            className="bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white text-xs h-9 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="h-4 w-4" /> Export RBH Report ({filteredPatients.length})
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total RBH Patients</span>
              <p className="text-2xl font-black text-slate-900">{totalRbh}</p>
              <p className="text-[9px] text-slate-500 font-medium">Referred from Camps</p>
            </div>
            <div className="h-10 w-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/40 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Visited Base Hospital</span>
              <p className="text-2xl font-black text-emerald-600">{visitedCount}</p>
              <p className="text-[9px] text-emerald-700 font-bold">
                {totalRbh > 0 ? `${Math.round((visitedCount / totalRbh) * 100)}% Arrival Rate` : "0%"}
              </p>
            </div>
            <div className="h-10 w-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border border-amber-200 shadow-xs bg-amber-50/40 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Pending Arrival</span>
              <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
              <p className="text-[9px] text-amber-700 font-medium">Awaiting Hospital Visit</p>
            </div>
            <div className="h-10 w-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border border-indigo-200 shadow-xs bg-indigo-50/40 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-indigo-800 font-bold uppercase tracking-wider">Procedures Completed</span>
              <p className="text-2xl font-black text-indigo-600">{surgicalInterventions}</p>
              <p className="text-[9px] text-indigo-700 font-medium">Laser / Injections / Surgery</p>
            </div>
            <div className="h-10 w-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border border-rose-200 shadow-xs bg-rose-50/40 p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider">Gift of Vision</span>
              <p className="text-2xl font-black text-rose-600">{giftOfVisionCount}</p>
              <p className="text-[9px] text-rose-700 font-medium">100% Free Sponsorships</p>
            </div>
            <div className="h-10 w-10 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="rounded-xl border border-slate-200 shadow-xs bg-white">
        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5 text-[#FF6B00]" /> Filter RBH Patient Cohort
            </CardTitle>
            <span className="text-[11px] font-extrabold text-[#FF6B00] bg-orange-100 px-2.5 py-0.5 rounded-md">
              {filteredPatients.length} Matches
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Arrival Status Tabs */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Base Arrival Status</label>
              <select
                value={filterArrival}
                onChange={(e) => setFilterArrival(e.target.value as any)}
                className="w-full text-xs border border-slate-300 p-2 rounded-xl bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="all">All RBH Patients ({patients.length})</option>
                <option value="visited">Visited Base Hospital ✓ ({visitedCount})</option>
                <option value="pending">Awaiting Visit / Pending ({pendingCount})</option>
              </select>
            </div>

            {/* Campsite Location */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Campsite Source</label>
              <select
                value={filterCamp}
                onChange={(e) => setFilterCamp(e.target.value)}
                className="w-full text-xs border border-slate-300 p-2 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">All Campsites</option>
                {places.map(p => (
                  <option key={p.id} value={p.shortCode}>{p.name} ({p.shortCode})</option>
                ))}
              </select>
            </div>

            {/* DR Stage */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">DR Diagnosis Stage</label>
              <select
                value={filterDrStatus}
                onChange={(e) => setFilterDrStatus(e.target.value)}
                className="w-full text-xs border border-slate-300 p-2 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">All DR Stages</option>
                <option value="Moderate NPDR">Moderate NPDR</option>
                <option value="Severe NPDR">Severe NPDR</option>
                <option value="PDR">PDR</option>
                <option value="Macular Edema">Macular Edema</option>
                <option value="Refer">Refer</option>
              </select>
            </div>

            {/* Procedure Outcome */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Procedure Outcome</label>
              <select
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value)}
                className="w-full text-xs border border-slate-300 p-2 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">All Outcomes</option>
                <option value="Laser">Laser Photocoagulation</option>
                <option value="Injection">Anti-VEGF Injection</option>
                <option value="Vitrectomy">Vitrectomy Procedure</option>
                <option value="Cataract">Phaco + Foldable IOL</option>
                <option value="Medical">Medical Management</option>
                <option value="Follow-Up">Follow-Up Review</option>
              </select>
            </div>

            {/* Gift of Vision */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Gift of Vision</label>
              <select
                value={filterGiftOfVision}
                onChange={(e) => setFilterGiftOfVision(e.target.value)}
                className="w-full text-xs border border-slate-300 p-2 rounded-xl bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                <option value="">All Patients</option>
                <option value="true">Gift of Vision Only 🎁</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient name, phone number, Unique ID, campsite, or doctor remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-[#FF6B00] font-medium"
            />
          </div>
        </CardContent>
      </Card>

      {/* RBH Patient Table */}
      <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-black uppercase text-slate-800">
              RBH Patient Register ({filteredPatients.length} Patients)
            </CardTitle>
            <CardDescription className="text-[10px]">
              Click "Update Base Visit" to record patient arrival, tertiary surgical outcome, and doctor remarks.
            </CardDescription>
          </div>
        </CardHeader>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-[#FF6B00]" /> Loading RBH Patient Cohort...
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-slate-50 border-dashed">
            No patients match the current RBH filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                  <th className="p-3">Unique ID & Camp</th>
                  <th className="p-3">Patient Details</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">DR Stage & Cataract</th>
                  <th className="p-3">Base Arrival Status</th>
                  <th className="p-3">Procedure Outcome & Remarks</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-orange-50/20 transition-colors">
                    {/* Unique ID & Camp */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-extrabold text-[#FF6B00] block">{p.uniqueId}</span>
                      <span className="text-[10px] text-slate-500 font-bold">{p.screeningPlaceCode}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{p.date}</span>
                    </td>

                    {/* Patient Details */}
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.age} Yrs • {p.gender}</p>
                      {p.referredToGiftOfVision && (
                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-300 inline-block mt-0.5">
                          🎁 Gift of Vision
                        </span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="p-3 whitespace-nowrap">
                      <a href={`tel:${p.phone}`} className="font-mono font-bold text-slate-800 hover:text-[#FF6B00] flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> {p.phone}
                      </a>
                      {p.alternatePhone && (
                        <span className="text-[10px] text-slate-400 font-mono block">Alt: {p.alternatePhone}</span>
                      )}
                    </td>

                    {/* DR & Cataract */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${DR_COLORS[p.drStatus] || "bg-slate-100"}`}>
                        {p.drStatus}
                      </span>
                      {p.hasCataract && p.hasCataract !== "None" && (
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-1.5 py-0.2 rounded block w-fit mt-1">
                          👁️ {p.hasCataract}
                        </span>
                      )}
                    </td>

                    {/* Arrival Status */}
                    <td className="p-3">
                      {p.visitedBaseHospital ? (
                        <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg text-emerald-900 w-fit">
                          <p className="text-[10px] font-extrabold flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-600" /> Visited Base Hospital
                          </p>
                          {p.baseHospitalVisitDate && (
                            <p className="text-[9px] font-mono text-emerald-700 mt-0.5">📅 {p.baseHospitalVisitDate}</p>
                          )}
                        </div>
                      ) : (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-600" /> Awaiting Arrival
                        </span>
                      )}
                    </td>

                    {/* Outcome & Remarks */}
                    <td className="p-3 max-w-xs space-y-1">
                      {p.baseHospitalVisitOutcome && (
                        <p className="text-[11px] font-extrabold text-indigo-950 bg-indigo-50 border border-indigo-100 p-1 rounded">
                          {p.baseHospitalVisitOutcome}
                        </p>
                      )}
                      {(p.baseHospitalNotes || p.baseHospitalRemarks) && (
                        <p className="text-[10px] text-slate-600 font-mono italic">
                          "{p.baseHospitalNotes || p.baseHospitalRemarks}"
                        </p>
                      )}
                      {!p.baseHospitalVisitOutcome && !p.baseHospitalNotes && !p.baseHospitalRemarks && (
                        <span className="text-[10px] text-slate-400 italic">No hospital remarks logged</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          onClick={() => openOutcomeModal(p)}
                          className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold text-[10px] h-7 px-2.5 rounded-lg shadow-2xs flex items-center gap-1"
                        >
                          <Building2 className="h-3 w-3" /> Update Base Visit
                        </Button>
                        <Link
                          href={`/patients/${p.id}`}
                          className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Interactive Base Hospital Visit Outcome & Remarks Modal */}
      {activePatient && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <Card className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <CardHeader className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-5 shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Building2 className="h-5 w-5" /> Base Hospital Visit & Outcome Logger
                  </CardTitle>
                  <CardDescription className="text-rose-100 text-xs mt-0.5">
                    {activePatient.name} ({activePatient.uniqueId}) • Phone: {activePatient.phone}
                  </CardDescription>
                </div>
                <button onClick={() => setActivePatient(null)} className="text-rose-100 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs overflow-y-auto">
              
              {/* Patient Arrival Toggle */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase">
                      Confirm Patient Arrival at Sankara Base Hospital *
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Toggle YES when patient arrives at registration desk or eye OPD.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVisitedToggle(true)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        visitedToggle 
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs" 
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      YES (Visited)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisitedToggle(false)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        !visitedToggle 
                          ? "bg-amber-600 text-white border-amber-600 shadow-2xs" 
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      NO (Pending)
                    </button>
                  </div>
                </div>

                {visitedToggle && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Hospital Visit / Consultation Date *
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full text-xs border border-slate-300 p-2 rounded-xl bg-white font-medium text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Tertiary Procedure / Outcome */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tertiary Procedure / Treatment Outcome Performed *
                </label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-xl bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Select Outcome / Procedure...</option>
                  {BASE_OUTCOMES.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* Doctor / Hospital Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Hospital Remarks, Surgeon Notes & Follow-Up Plan
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter laser shots/quadrants, anti-VEGF dosage, post-op visual acuity, surgical notes, or next appointment date..."
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-xl bg-white outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-800"
                />
              </div>

              {/* Fundus Image Upload / Attachment */}
              <div className="border border-dashed border-slate-300 bg-slate-50/70 p-3.5 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-orange-500" /> Base Hospital Fundus Image
                  </p>
                  <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                    <Upload className="h-3 w-3" /> Select Image
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  </label>
                </div>

                {uploadPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black p-1 max-w-xs mx-auto">
                    <img 
                      src={uploadPreview} 
                      alt="Base Hospital Fundus" 
                      className="w-full h-40 object-contain rounded cursor-pointer"
                      onClick={() => setFullscreenImage(uploadPreview)}
                    />
                    <button
                      type="button"
                      onClick={() => { setUploadFile(null); setUploadPreview(null); }}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full shadow"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 text-center py-2">
                    No hospital fundus photo attached. You can optionally upload high-resolution Remidio images here.
                  </p>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setActivePatient(null)}
                  variant="outline"
                  className="flex-1 text-xs h-9 rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveOutcome}
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-rose-600 hover:to-red-700 text-white text-xs h-9 rounded-xl font-bold shadow-md"
                >
                  {isSaving ? "Saving..." : "Save Base Hospital Outcome & Remarks"}
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
