import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Calendar, MapPin, Phone, User, 
  Activity, ShieldAlert, CheckCircle, Clock, 
  Printer, Download, ZoomIn, ZoomOut, X, RefreshCw, Heart, Upload
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
  diabetesDuration: string;
  bloodPressure?: string;
  drStatus: string;
  advice: string;
  imagePath: string;
  imageQuality: string;
  latitude: string | null;
  longitude: string | null;
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
  "Refer": "bg-red-100 text-red-800 border-red-200"
};

const REFERRAL_STEPS = ["Referred", "Visited", "Treated", "Follow-up"];

export default function DrsmsPatientDetails({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingReferral, setIsUpdatingReferral] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <RefreshCw className="h-8 w-8 text-[#FF6B00] animate-spin mb-2" />
        <span className="text-sm text-slate-500">Loading screening files...</span>
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
          <ArrowLeft className="h-4 w-4" /> Back to Records
        </Link>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 h-8 rounded-lg flex items-center gap-1">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          {(user?.userType === "super_admin" || (user?.userType as string) === "field_user") && (
            <Link href={`/patients/${patient.id}/edit`} className="bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs px-4 h-8 rounded-lg flex items-center gap-1 shadow-sm font-semibold">
              Edit Patient
            </Link>
          )}
        </div>
      </div>

      {/* Printable Area Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Demographic Cards & Diagnosis */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-500/10 to-[#FF6B00]/5 py-4 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">{patient.name}</CardTitle>
                  <CardDescription className="text-xs">ID: {patient.uniqueId}</CardDescription>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${DR_COLORS[patient.drStatus] || "bg-slate-100"}`}>
                  {patient.drStatus}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Patient Core Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demographics</h3>
                <div className="space-y-3.5 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <User className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    <span>{patient.age} Years • {patient.gender}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    <span>{patient.address || "Address not provided"}</span>
                  </div>
                </div>
              </div>

              {/* Diagnosis metadata */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Details</h3>
                <div className="space-y-3.5 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    <span>Diabetes: <span className="font-semibold text-slate-800">{patient.diabetesDuration}</span></span>
                  </div>
                  {patient.bloodPressure && (
                    <div className="flex items-center gap-3">
                      <Heart className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                      <span>Blood Pressure: <span className="font-semibold text-slate-800">{patient.bloodPressure} mmHg</span></span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Activity className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    <span>Advice: <span className="font-bold text-orange-600">{patient.advice}</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    <span>Screening Date: {patient.date}</span>
                  </div>
                  {patient.referToBaseHospital && (
                    <div className="flex items-center gap-3 text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 w-fit">
                      <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                      <span>Refer to Base Hospital</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Status tracker */}
          <Card className="rounded-xl border border-slate-200 shadow-xs print:hidden">
            <CardHeader className="py-4 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-800">Referral Status Tracking</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
              {/* Stepper progress bar */}
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
          <Card className="rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-xs font-semibold text-slate-500 mb-2">Patient lookup QR Code</h3>
            <div className="border border-slate-150 p-2 bg-white rounded-xl shadow-xs">
              <img src={qrCodeUrl} alt="Patient QR Code" className="h-32 w-32 object-contain" />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">{patient.uniqueId}</p>
          </Card>

          {/* Fundus image preview card & Base Hospital Upload */}
          <Card className="rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="py-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Fundus Image</span>
              <span className="text-[10px] text-slate-400 font-mono">Quality: {patient.imageQuality}</span>
            </CardHeader>
            <div className="bg-slate-900 aspect-square flex flex-col items-center justify-center relative overflow-hidden group p-2">
              {patient.imagePath.includes("Pending") || patient.imagePath === "placeholder_fundus.jpg" ? (
                <div className="flex flex-col items-center justify-center text-center p-6 text-slate-300 gap-3">
                  <Upload className="h-10 w-10 text-orange-400 animate-pulse" />
                  <div>
                    <p className="font-bold text-sm text-white">Image Upload Pending</p>
                    <p className="text-[11px] text-slate-400 mt-1">Screened in camp. Attach fundus photos here at the Base Hospital / Vision Center.</p>
                  </div>
                  <label className="cursor-pointer bg-[#FF6B00] hover:bg-[#E05E00] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md mt-2 flex items-center gap-1.5">
                    <Upload className="h-4 w-4" /> Upload Hospital Image
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
                            body: JSON.stringify({ imagePath })
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
                    className="max-h-full max-w-full object-contain transition-transform"
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
                              body: JSON.stringify({ imagePath })
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
