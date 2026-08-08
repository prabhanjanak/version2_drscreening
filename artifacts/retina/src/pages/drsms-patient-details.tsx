import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Calendar, MapPin, Phone, User, 
  Activity, ShieldAlert, CheckCircle, Clock, 
  Printer, Download, ZoomIn, ZoomOut, X, RefreshCw, Heart, Upload,
  Award, Eye, FileText, Check, AlertCircle, Building, Sparkles
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
  address: string | null;
  phone: string;
  alternatePhone?: string | null;
  referralSource?: string | null;
  diabetesDuration: string;
  diabetesMeasureType?: string | null;
  diabetesMeasureValue?: string | null;
  grbsRecordedBy?: string | null;
  chcPhcCenterName?: string | null;
  bloodPressure?: string | null;
  drStatus: string;
  hasCataract?: string | null;
  cataractPlanning?: string | null;
  fundusCaptured?: boolean;
  fundusNotCapturedReason?: string | null;
  advice: string;
  imagePath: string;
  imageQuality: string;
  latitude: string | null;
  longitude: string | null;
  referralStatus: string;
  referToBaseHospital?: boolean;
  baseHospitalRemarks?: string | null;
  remarks?: string | null;
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
  "Refer": "bg-red-100 text-red-800 border-red-200"
};

const REFERRAL_STEPS = ["Referred", "Visited", "Treated", "Follow-up"];

const BASE_OUTCOMES = [
  "Laser Photocoagulation (PRP / Focal) Completed",
  "Intravitreal Anti-VEGF Injection Administered",
  "Vitrectomy Surgical Procedure",
  "Cataract Surgery (Phacoemulsification + Foldable IOL)",
  "Medical Management & Glycemic Control Advised",
  "Scheduled for 3-Month Follow-Up"
];

export default function DrsmsPatientDetails({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingReferral, setIsUpdatingReferral] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // Base Hospital Visit Tracking State
  const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
  const [baseOutcome, setBaseOutcome] = useState("");
  const [baseNotes, setBaseNotes] = useState("");
  const [isSubmittingBase, setIsSubmittingBase] = useState(false);

  const fetchPatient = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/patients/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load patient record");
      const data = await res.json();
      setPatient(data);
      if (data.baseHospitalVisitOutcome) setBaseOutcome(data.baseHospitalVisitOutcome);
      if (data.baseHospitalNotes) setBaseNotes(data.baseHospitalNotes);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setLocation("/patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [params.id]);

  const updateReferralStatus = async (status: string) => {
    if (!patient) return;
    setIsUpdatingReferral(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ referralStatus: status })
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setPatient(updated);
      toast({ title: "Status Updated", description: `Referral status is now: ${status}` });
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUpdatingReferral(false);
    }
  };

  const handleSaveBaseHospitalVisit = async () => {
    if (!patient) return;
    setIsSubmittingBase(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/patients/${patient.id}/base-visit`, {
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
      setPatient(updated);
      setIsBaseModalOpen(false);
      toast({ 
        title: "Base Hospital Visit Recorded! 🏥", 
        description: `Marked ${patient.name} as visited Sankara Base Hospital with outcome recorded.` 
      });
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmittingBase(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <RefreshCw className="h-8 w-8 text-[#FF6B00] animate-spin mb-2" />
        <span className="text-sm text-slate-500">Loading digital health record...</span>
      </div>
    );
  }

  if (!patient) return null;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${patient.uniqueId}`;

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6 print:bg-white print:p-0">
      {/* Top action header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 print:hidden">
        <Link href="/patients" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Camp Records
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handlePrint} variant="outline" className="h-8 text-xs font-bold bg-white text-slate-700 border-slate-200 flex items-center gap-1">
            <Printer className="h-3.5 w-3.5" /> Print Health Record
          </Button>

          <Button
            onClick={() => setIsBaseModalOpen(true)}
            className={`h-8 text-xs font-bold px-3 rounded-lg flex items-center gap-1.5 shadow-2xs ${
              patient.visitedBaseHospital 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-rose-600 hover:to-red-700 text-white"
            }`}
          >
            <Building className="h-3.5 w-3.5" />
            {patient.visitedBaseHospital ? "Base Hospital Visit (Done ✓)" : "Record Base Hospital Visit"}
          </Button>

          {(user?.userType === "super_admin" || (user?.userType as string) === "field_user") && (
            <Link href={`/patients/${patient.id}/edit`} className="bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs px-4 h-8 rounded-lg flex items-center gap-1 shadow-xs font-semibold">
              Edit Record
            </Link>
          )}
        </div>
      </div>

      {/* Printable Area Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        
        {/* Left Side: Demographic Cards & Diagnosis */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header Banner */}
          <Card className="rounded-xl border border-slate-200 shadow-xs overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-orange-500/10 to-[#FF6B00]/5 py-4 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-black text-slate-900">{patient.name}</CardTitle>
                    {patient.referredToGiftOfVision && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-emerald-600" /> Gift of Vision
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs font-mono font-bold text-slate-500">
                    Unique ID: <strong className="text-[#FF6B00]">{patient.uniqueId}</strong> • Camp: <strong>{patient.screeningPlaceCode}</strong> • Date: <strong>{patient.date}</strong>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${DR_COLORS[patient.drStatus] || "bg-slate-100"}`}>
                    {patient.drStatus}
                  </span>
                  {patient.visitedBaseHospital && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                      Visited Base ✓
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6 text-xs text-slate-700">
              
              {/* STATION 1: DEMOGRAPHICS & REFERRAL SOURCE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="h-5 w-5 rounded-full bg-[#FF6B00] text-white text-[10px] font-black flex items-center justify-center">1</span>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Demographics, Awareness & Schemes</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{patient.age} Years • <strong>{patient.gender}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-mono font-bold">{patient.phone}</span>
                      {patient.alternatePhone && (
                        <span className="text-[11px] text-slate-400 font-mono">(Alt: {patient.alternatePhone})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{patient.address || "Address not provided"}</span>
                    </div>
                  </div>

                  <div className="space-y-2 bg-orange-50/40 p-3 rounded-xl border border-orange-100">
                    <p className="text-[10px] font-bold text-orange-950 uppercase">Referral / Camp Awareness Source:</p>
                    <p className="text-xs font-bold text-slate-800">
                      📢 {patient.referralSource || "Direct Camp Walk-in / ASHA Outreach"}
                    </p>

                    {patient.govtSchemes && patient.govtSchemes.length > 0 && (
                      <div className="pt-2 border-t border-orange-100">
                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Government Schemes / Insurance:</p>
                        <div className="flex flex-wrap gap-1">
                          {patient.govtSchemes.map((s) => (
                            <span key={s} className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {patient.referredToGiftOfVision && (
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl space-y-1">
                    <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-600" /> Gift of Vision Free Sponsorship
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Patient is enrolled for 100% free surgical care, food, and transport sponsorship under Sankara Eye Foundation.
                    </p>
                    {patient.giftOfVisionNotes && (
                      <p className="text-[10px] font-mono text-emerald-900 bg-white/80 p-1.5 rounded border border-emerald-200">
                        Notes: {patient.giftOfVisionNotes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* STATION 2: CHC / PHC LAB & DIABETIC VITALS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="h-5 w-5 rounded-full bg-[#FF6B00] text-white text-[10px] font-black flex items-center justify-center">2</span>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">CHC / PHC Lab & Diabetic Vitals</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Diabetes Duration</p>
                    <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-orange-500" /> {patient.diabetesDuration}
                    </p>
                  </div>

                  <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-1">
                    <p className="text-[10px] font-bold text-indigo-900 uppercase">
                      {patient.diabetesMeasureType || "GRBS"} Glucose Level
                    </p>
                    <p className="text-sm font-black text-indigo-950">
                      {patient.diabetesMeasureValue ? `${patient.diabetesMeasureValue}` : "Not Recorded at Camp"}
                    </p>
                    <p className="text-[9px] text-indigo-600 font-semibold">
                      Done by: {patient.grbsRecordedBy || "CHC Staff"} {patient.chcPhcCenterName ? `(${patient.chcPhcCenterName})` : ""}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Pressure</p>
                    <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Heart className="h-4 w-4 text-rose-500" /> {patient.bloodPressure ? `${patient.bloodPressure} mmHg` : "Not Recorded"}
                    </p>
                  </div>
                </div>
              </div>

              {/* STATION 3: OPHTHALMIC, CATARACT SEGREGATION & ADVICE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="h-5 w-5 rounded-full bg-[#FF6B00] text-white text-[10px] font-black flex items-center justify-center">3</span>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Ophthalmic Assessment & Cataract Planning</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cataract Segregation */}
                  <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-2">
                    <p className="text-xs font-black text-amber-950 uppercase flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-amber-700" /> Cataract Segregation:
                    </p>
                    <p className="text-xs font-extrabold text-amber-900">
                      Stage: <span className="underline">{patient.hasCataract || "None"}</span>
                    </p>
                    {patient.cataractPlanning && (
                      <p className="text-[11px] font-bold text-amber-800 bg-white/90 p-1.5 rounded border border-amber-200">
                        Future Action: {patient.cataractPlanning}
                      </p>
                    )}
                  </div>

                  {/* Advice & Action Plan */}
                  <div className="bg-orange-50/50 p-3.5 rounded-xl border border-orange-200 space-y-2">
                    <p className="text-xs font-black text-orange-950 uppercase flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-[#FF6B00]" /> Advice / Action Plan:
                    </p>
                    <p className="text-xs font-extrabold text-slate-900 bg-white p-2 rounded-lg border border-orange-100">
                      {patient.advice}
                    </p>
                  </div>
                </div>

                {/* Base Hospital Referral Notes */}
                {patient.referToBaseHospital && (
                  <div className="bg-red-50/60 border border-red-200 p-3.5 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-red-700 font-extrabold">
                      <ShieldAlert className="h-4 w-4" /> Refer to Base Hospital Flagged
                    </div>
                    <p className="text-[11px] text-red-900 font-medium">
                      Remarks: {patient.baseHospitalRemarks || "Patient referred for tertiary vitreoretinal / laser assessment."}
                    </p>
                  </div>
                )}

                {patient.remarks && (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> General Screening Remarks:
                    </p>
                    <p className="text-xs text-slate-800 font-medium">{patient.remarks}</p>
                  </div>
                )}
              </div>

              {/* BASE HOSPITAL VISIT OUTCOME SECTION */}
              {patient.visitedBaseHospital && (
                <div className="bg-emerald-50/70 border border-emerald-300 p-4 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-emerald-950 uppercase flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-emerald-600" /> Tertiary Base Hospital Visit Outcome
                    </p>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Date: {patient.baseHospitalVisitDate || "Visited"}
                    </span>
                  </div>
                  <p className="text-xs font-extrabold text-slate-900 bg-white p-2.5 rounded-lg border border-emerald-200">
                    Outcome: {patient.baseHospitalVisitOutcome || "Clinical management completed."}
                  </p>
                  {patient.baseHospitalNotes && (
                    <p className="text-[11px] text-slate-700 font-medium bg-white/80 p-2 rounded-lg border border-emerald-100">
                      Hospital Clinical Notes: {patient.baseHospitalNotes}
                    </p>
                  )}
                </div>
              )}

            </CardContent>
          </Card>

          {/* Referral Status tracker */}
          <Card className="rounded-xl border border-slate-200 shadow-xs print:hidden bg-white">
            <CardHeader className="py-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">Referral Pipeline Stage</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
                {REFERRAL_STEPS.map((step, idx) => {
                  const isActive = REFERRAL_STEPS.indexOf(patient.referralStatus) >= idx;
                  return (
                    <button
                      key={step}
                      disabled={isUpdatingReferral}
                      onClick={() => updateReferralStatus(step)}
                      className={`relative z-10 flex flex-col items-center gap-2 group focus:outline-none`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        isActive 
                          ? "bg-orange-500 border-orange-500 text-white font-bold" 
                          : "bg-white border-slate-300 text-slate-400 group-hover:border-slate-400"
                      }`}>
                        {idx + 1}
                      </div>
                      <span className={`text-[10px] font-semibold tracking-tight transition-colors ${
                        isActive ? "text-orange-600" : "text-slate-500"
                      }`}>{step}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Image and QR Code print templates */}
        <div className="space-y-6">
          {/* QR Code section */}
          <Card className="rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center p-6 text-center bg-white">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Patient Digital QR Code</h3>
            <div className="border border-slate-150 p-2 bg-white rounded-xl shadow-xs">
              <img src={qrCodeUrl} alt="Patient QR Code" className="h-32 w-32 object-contain" />
            </div>
            <p className="text-xs text-slate-800 font-mono font-bold mt-2">{patient.uniqueId}</p>
          </Card>

          {/* Fundus image preview card & Base Hospital Upload */}
          <Card className="rounded-xl border border-slate-200 shadow-xs overflow-hidden bg-white">
            <CardHeader className="py-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Retinal Fundus Image</span>
              <span className="text-[10px] text-slate-400 font-mono">Quality: {patient.imageQuality}</span>
            </CardHeader>
            <div className="bg-slate-900 aspect-square flex flex-col items-center justify-center relative overflow-hidden group p-2">
              {(!patient.imagePath || patient.imagePath.includes("Pending") || patient.imagePath === "placeholder_fundus.jpg" || patient.imagePath === "/uploads/no_fundus_photo.png") ? (
                <div className="flex flex-col items-center justify-center text-center p-6 text-slate-300 gap-3">
                  <Upload className="h-10 w-10 text-orange-400 animate-pulse" />
                  <div>
                    <p className="font-bold text-sm text-white">Image Upload Pending</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {patient.fundusNotCapturedReason ? `Reason at camp: ${patient.fundusNotCapturedReason}` : "Attach Remidio fundus images at Base Hospital / Vision Center."}
                    </p>
                  </div>
                  <label className="cursor-pointer bg-[#FF6B00] hover:bg-[#E05E00] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md mt-2 flex items-center gap-1.5">
                    <Upload className="h-4 w-4" /> Upload Base Hospital Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const token = localStorage.getItem("vision2020_token");
                          const formData = new FormData();
                          formData.append("image", file);
                          const uploadRes = await fetch("/api/patients/upload-image", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}` },
                            body: formData
                          });
                          if (!uploadRes.ok) throw new Error("Upload failed");
                          const { imagePath } = await uploadRes.json();
                          await fetch(`/api/patients/${patient.id}`, {
                            method: "PUT",
                            headers: { 
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}` 
                            },
                            body: JSON.stringify({ imagePath, fundusCaptured: true })
                          });
                          toast({ title: "Image Uploaded! 📸", description: "Fundus image attached to patient record." });
                          fetchPatient();
                        } catch (err: any) {
                          toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
                        }
                      }} 
                    />
                  </label>
                </div>
              ) : (
                <>
                  <img 
                    src={patient.imagePath} 
                    alt="Patient Fundus" 
                    style={{ transform: `scale(${zoomLevel})` }}
                    className="max-h-full max-w-full object-contain transition-transform cursor-pointer"
                    onClick={() => setFullscreenOpen(true)}
                  />
                  {/* Zoom & Replace Buttons overlay */}
                  <div className="absolute bottom-4 right-4 flex gap-1 bg-black/60 backdrop-blur-xs p-1 rounded-lg border border-white/20 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                      className="p-1 text-white hover:text-orange-400"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                      className="p-1 text-white hover:text-orange-400"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <label className="cursor-pointer p-1 text-white hover:text-orange-400 border-l border-white/10 pl-2">
                      <Upload className="h-4 w-4" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const token = localStorage.getItem("vision2020_token");
                            const formData = new FormData();
                            formData.append("image", file);
                            const uploadRes = await fetch("/api/patients/upload-image", {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` },
                              body: formData
                            });
                            if (!uploadRes.ok) throw new Error("Upload failed");
                            const { imagePath } = await uploadRes.json();
                            await fetch(`/api/patients/${patient.id}`, {
                              method: "PUT",
                              headers: { 
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}` 
                              },
                              body: JSON.stringify({ imagePath, fundusCaptured: true })
                            });
                            toast({ title: "Image Replaced! 📸", description: "Updated fundus image for patient." });
                            fetchPatient();
                          } catch (err: any) {
                            toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
                          }
                        }} 
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

      </div>

      {/* Base Hospital Visit Outcome Modal */}
      {isBaseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <Card className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Building className="h-5 w-5" /> Base Hospital Visit Outcome
                  </CardTitle>
                  <CardDescription className="text-rose-100 text-xs mt-0.5">
                    {patient.name} ({patient.uniqueId}) • Mobile: {patient.phone}
                  </CardDescription>
                </div>
                <button onClick={() => setIsBaseModalOpen(false)} className="text-rose-100 hover:text-white">
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
                  onClick={() => setIsBaseModalOpen(false)}
                  variant="outline"
                  className="flex-1 text-xs h-9 rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveBaseHospitalVisit}
                  disabled={isSubmittingBase || !baseOutcome}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-rose-600 hover:to-red-700 text-white text-xs h-9 rounded-xl font-bold shadow-md"
                >
                  {isSubmittingBase ? "Saving..." : "Save Base Visit Outcome"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fullscreen Overlay */}
      {fullscreenOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <button 
            onClick={() => setFullscreenOpen(false)}
            className="absolute top-4 right-4 text-white p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
          <img src={patient.imagePath} alt="Fullscreen Fundus" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
