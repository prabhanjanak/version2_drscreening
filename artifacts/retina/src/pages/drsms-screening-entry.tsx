import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Camera, Upload, X, ZoomIn, RefreshCw, Save,
  AlertTriangle, CheckCircle, Wifi, WifiOff, MapPin, 
  User, Phone, Calendar, Heart, ShieldAlert, FileText, Search, PlusCircle, Activity
} from "lucide-react";
import { offlineDB, OfflineScreeningEntry } from "@/lib/offline-db";

const screeningFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  screeningPlaceCode: z.string().min(1, "Screening Place is required"),
  patientName: z.string().min(2, "Patient name must be at least 2 characters"),
  age: z.coerce.number().min(1, "Age is required").max(120, "Age must be 120 or below"),
  gender: z.string().min(1, "Gender is required"),
  address: z.string().optional().default(""),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  diabetesDuration: z.string().min(1, "Duration of diabetes is required"),
  systolicBP: z.string().optional().default(""),
  diastolicBP: z.string().optional().default(""),
  drStatus: z.string().min(1, "DR Status is required"),
  advice: z.string().min(1, "Advice is required"),
  imageQuality: z.string().default("Good"),
  referToBaseHospital: z.boolean().default(false),
  baseHospitalRemarks: z.string().optional().default(""),
  otherAdvice: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type FormValues = z.infer<typeof screeningFormSchema>;

const GENDER_OPTIONS = ["Male", "Female", "Other"];

const DIABETES_DURATION_OPTIONS = [
  "No Diabetes",
  "Newly Diagnosed",
  "0-1 Year",
  "1-5 Years",
  "5-10 Years",
  "10+ Years",
];

const DR_STATUS_OPTIONS = [
  "No DR",
  "Mild NPDR",
  "Moderate NPDR",
  "Severe NPDR",
  "PDR",
  "Macular Edema",
  "Ungradable",
  "Refer",
];

const ADVICE_OPTIONS = [
  "Annual Review",
  "6 Month Review",
  "3 Month Review",
  "Urgent Retina Consultation",
  "Laser Required",
  "Injection Required",
  "Surgery Advised",
  "Others",
];

const QUALITY_OPTIONS = ["Good", "Blur", "Ungradable"];

export default function DrsmsScreeningEntry() {
  const { user } = useAuth();
  const { toast } = useToast();

  if ((user?.userType as string) === "asha_worker") {
    return (
      <div className="flex-1 p-6 flex items-center justify-center bg-slate-50/50">
        <Card className="max-w-md w-full bg-white rounded-xl shadow-md border border-slate-200 p-6 text-center space-y-4">
          <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Heart className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">ASHA Worker Data Collection Portal</h2>
            <p className="text-xs text-slate-500 mt-1">
              ASHA Workers collect door-to-door patient referral data. Full clinical eye screening forms are filled at the DR Camp by attending doctors and field screeners.
            </p>
          </div>
          <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white text-xs font-bold h-10 rounded-xl">
            <a href="/asha-referrals">Go to ASHA Patient Referrals</a>
          </Button>
        </Card>
      </div>
    );
  }

  const [places, setPlaces] = useState<any[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [activeCampCode, setActiveCampCode] = useState<string | null>(localStorage.getItem("activeCampCode"));
  const [serialInfo, setSerialInfo] = useState({ nextSerial: 1, uniqueId: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // VC Referrals state
  const [vcModalOpen, setVcModalOpen] = useState(false);
  const [vcReferrals, setVcReferrals] = useState<any[]>([]);
  const [loadingVcReferrals, setLoadingVcReferrals] = useState(false);

  // Camp search query
  const [searchQuery, setSearchQuery] = useState("");
  const patientNameRef = useRef<HTMLInputElement | null>(null);

  const fetchVcReferrals = async () => {
    if (!activeCampCode) return;
    setLoadingVcReferrals(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/vc-referrals?targetCampCode=${activeCampCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVcReferrals(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVcReferrals(false);
    }
  };

  const handleApplyReferral = (refItem: any) => {
    setValue("patientName", refItem.patientName);
    setValue("age", Number(refItem.age));
    setValue("gender", refItem.gender);
    setValue("phone", refItem.phone);
    if (refItem.address) setValue("address", refItem.address);
    toast({
      title: "Referral Loaded!",
      description: `Auto-filled details for ${refItem.patientName} referred by ${refItem.visionCenterName || refItem.visionCenterCode}.`
    });
    setVcModalOpen(false);
  };

  const handleMarkNoShow = async (refItem: any) => {
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/vc-referrals/${refItem.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "follow_up_required" }),
      });

      if (res.ok) {
        toast({
          title: "Moved to Follow-Up List 📋",
          description: `Marked ${refItem.patientName} as No-Show. Added to Follow-Up panel.`,
        });
        if (activeCampCode) fetchVcReferrals();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update referral status", variant: "destructive" });
    }
  };

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(screeningFormSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      screeningPlaceCode: activeCampCode || "",
      patientName: "",
      age: 45,
      gender: "Male",
      address: "",
      phone: "",
      diabetesDuration: "Newly Diagnosed",
      systolicBP: "",
      diastolicBP: "",
      drStatus: "No DR",
      advice: "Annual Review",
      imageQuality: "Good",
      referToBaseHospital: false,
      baseHospitalRemarks: "",
      otherAdvice: "",
      remarks: "",
      latitude: "",
      longitude: "",
    }
  });

  const selectedPlace = watch("screeningPlaceCode");
  const selectedDate = watch("date");
  const phoneValue = watch("phone");

  // Track online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "Back online", description: "Auto-sync triggered." });
      triggerOfflineSync();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const triggerOfflineSync = async () => {
    const queue = await offlineDB.getAllEntries();
    if (queue.length === 0) return;
    const token = localStorage.getItem("vision2020_token");

    for (const entry of queue) {
      try {
        let remotePath = entry.imagePath;
        if (entry.imagePath.startsWith("data:")) {
          const blob = await fetch(entry.imagePath).then(r => r.blob());
          const file = new File([blob], "offline_photo.jpg", { type: "image/jpeg" });
          const formData = new FormData();
          formData.append("image", file);

          const imgRes = await fetch("/api/patients/upload-image", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (imgRes.ok) {
            const data = await imgRes.json();
            remotePath = data.imagePath;
          }
        }

        await fetch("/api/patients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ ...entry, imagePath: remotePath })
        });
        await offlineDB.deleteEntry(entry.id!);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Load places with offline fallback
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const token = localStorage.getItem("vision2020_token");
        const res = await fetch("/api/screening-places", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const activePlaces = data.filter((p: any) => p.status === "active");
          setPlaces(activePlaces);
          localStorage.setItem("cached_places", JSON.stringify(data));
        } else {
          throw new Error("Network response not ok");
        }
      } catch (err) {
        console.error("Offline fallback: Loading cached screening places", err);
        const cached = localStorage.getItem("cached_places");
        if (cached) {
          const data = JSON.parse(cached);
          const activePlaces = data.filter((p: any) => p.status === "active");
          setPlaces(activePlaces);
        }
      } finally {
        setLoadingPlaces(false);
      }
    };
    fetchPlaces();

    // Check draft
    offlineDB.getDraft().then(draft => {
      if (draft) {
        Object.keys(draft).forEach((key) => {
          if (key !== "imagePath" && key !== "id") {
            setValue(key as any, (draft as any)[key]);
          }
        });
        if (draft.bloodPressure && typeof draft.bloodPressure === "string") {
          const parts = draft.bloodPressure.split("/");
          if (parts.length === 2) {
            setValue("systolicBP", parts[0]);
            setValue("diastolicBP", parts[1]);
          }
        }
        if (draft.imagePath) {
          setImagePreview(draft.imagePath);
        }
      }
    });
  }, [setValue]);

  // Sync camp code
  useEffect(() => {
    if (activeCampCode) {
      setValue("screeningPlaceCode", activeCampCode);
      localStorage.setItem("activeCampCode", activeCampCode);
    } else {
      localStorage.removeItem("activeCampCode");
    }
  }, [activeCampCode, setValue]);

  // Load Next Serial
  useEffect(() => {
    if (!selectedPlace || !selectedDate) return;
    const fetchSerial = async () => {
      try {
        const token = localStorage.getItem("vision2020_token");
        const res = await fetch(`/api/patients/next-serial?placeCode=${selectedPlace}&date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSerialInfo(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSerial();
  }, [selectedPlace, selectedDate]);

  // Phone warning
  useEffect(() => {
    if (phoneValue?.length !== 10) {
      setDuplicateWarning(null);
      return;
    }
    const checkDuplicate = async () => {
      try {
        const token = localStorage.getItem("vision2020_token");
        const res = await fetch(`/api/patients?phone=${phoneValue}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const list = await res.json();
          if (list.length > 0) {
            setDuplicateWarning(`Warning: Phone ${phoneValue} was screened on ${list[0].date} previously.`);
          } else {
            setDuplicateWarning(null);
          }
        }
      } catch {}
    };
    checkDuplicate();
  }, [phoneValue]);

  const compressImage = (file: File): Promise<File> => {
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
          const maxDim = 1600;
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
              resolve(new File([blob], file.name, { type: file.type }));
            } else {
              resolve(file);
            }
          }, "image/jpeg", 0.85);
        };
      };
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const compressed = await compressImage(file);
    setImageFile(compressed);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      const formValues = watch();
      offlineDB.saveDraft({ ...formValues, imagePath: base64 });
    };
    reader.readAsDataURL(compressed);
  };

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS Error", description: "Geolocation not supported by device", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", pos.coords.latitude.toString());
        setValue("longitude", pos.coords.longitude.toString());
        setGpsLoading(false);
        toast({ title: "GPS Captured", description: `Location locked: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
      },
      () => {
        setGpsLoading(false);
        toast({ title: "GPS Failed", description: "Unable to lock coordinates. Using offline mode.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const onSubmit = async (values: FormValues) => {
    // Fundus image is optional. If not uploaded, fallback to default placeholder.
    const effectiveImagePreview = imagePreview || "/uploads/no_fundus_photo.png";

    if (!isOnline) {
      const bloodPressureStr = `${values.systolicBP}/${values.diastolicBP}`;
      const offlineEntry: OfflineScreeningEntry = {
        date: values.date,
        screeningPlaceCode: values.screeningPlaceCode,
        serialNumber: serialInfo.nextSerial,
        uniqueId: serialInfo.uniqueId,
        name: values.patientName,
        age: values.age,
        gender: values.gender,
        address: values.address,
        phone: values.phone,
        diabetesDuration: values.diabetesDuration,
        bloodPressure: bloodPressureStr,
        drStatus: values.drStatus,
        advice: values.advice,
        imagePath: effectiveImagePreview,
        imageQuality: values.imageQuality,
        latitude: values.latitude,
        longitude: values.longitude,
        referralStatus: "Referred",
        referToBaseHospital: values.referToBaseHospital
      };
      try {
        await offlineDB.addEntry(offlineEntry);
        offlineDB.clearDraft();
        setImageFile(null);
        setImagePreview(null);
        reset({
          date: new Date().toISOString().split("T")[0],
          screeningPlaceCode: activeCampCode || "",
          patientName: "",
          age: 45,
          gender: "Male",
          address: "",
          phone: "",
          diabetesDuration: "Newly Diagnosed",
          systolicBP: "120",
          diastolicBP: "80",
          drStatus: "No DR",
          advice: "Annual Review",
          imageQuality: "Good",
          referToBaseHospital: false,
          latitude: "",
          longitude: ""
        });
        toast({ title: "Saved Offline", description: "Record queued inside device storage successfully." });
      } catch (err: any) {
        toast({ title: "Offline Save Failed", description: err.message, variant: "destructive" });
      }
      return;
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      let remoteImagePath = "";

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const imgRes = await fetch("/api/patients/upload-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (!imgRes.ok) throw new Error("Image upload failed");
        const imgData = await imgRes.json();
        remoteImagePath = imgData.imagePath;
      } else {
        remoteImagePath = imagePreview || "/uploads/no_fundus_photo.png";
      }

      const bloodPressureStr = (values.systolicBP?.trim() || values.diastolicBP?.trim()) ? `${values.systolicBP || ""}/${values.diastolicBP || ""}` : null;
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: values.date,
          screeningPlaceCode: values.screeningPlaceCode,
          name: values.patientName,
          age: values.age,
          gender: values.gender,
          address: values.address,
          phone: values.phone,
          diabetesDuration: values.diabetesDuration,
          bloodPressure: bloodPressureStr,
          drStatus: values.drStatus,
          advice: values.advice === "Others" && values.otherAdvice?.trim() ? `Others: ${values.otherAdvice.trim()}` : values.advice,
          imagePath: remoteImagePath,
          imageQuality: values.imageQuality,
          latitude: values.latitude,
          longitude: values.longitude,
          referralStatus: "Referred",
          referToBaseHospital: values.referToBaseHospital,
          baseHospitalRemarks: values.baseHospitalRemarks,
          remarks: values.remarks,
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save record");
      }

      offlineDB.clearDraft();
      setImageFile(null);
      setImagePreview(null);
      reset({
        date: new Date().toISOString().split("T")[0],
        screeningPlaceCode: activeCampCode || "",
        patientName: "",
        age: 45,
        gender: "Male",
        address: "",
        phone: "",
        diabetesDuration: "Newly Diagnosed",
        systolicBP: "120",
        diastolicBP: "80",
        drStatus: "No DR",
        advice: "Annual Review",
        imageQuality: "Good",
        referToBaseHospital: false,
        latitude: "",
        longitude: ""
      });
      toast({ title: "Patient Screened", description: "Patient records successfully saved to central server." });
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onInvalidSubmit = (formErrors: any) => {
    console.error("Form validation failed:", formErrors);
    const errorKeys = Object.keys(formErrors);
    if (errorKeys.length > 0) {
      const firstError = formErrors[errorKeys[0]];
      toast({
        title: "Validation Failed",
        description: firstError?.message || "Please check all required fields.",
        variant: "destructive"
      });
    }
  };

  const handleFieldChange = (name: string, value: any) => {
    setValue(name as any, value);
    const formValues = watch();
    offlineDB.saveDraft({ ...formValues, imagePath: imagePreview || undefined });
  };

  // Filter places based on search query
  const filteredPlaces = places.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ──── LOCK SCREEN IF NO ACTIVE CAMP SELECTED ────
  if (!activeCampCode) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 overflow-y-auto">
        <Card className="w-full max-w-lg bg-white border border-slate-200 shadow-xl rounded-2xl p-6">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <MapPin className="h-6 w-6 text-[#FF6B00]" />
              </div>
              <h2 className="text-base font-extrabold text-slate-800">Campsite Session Portal</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select and open the active campsite before collecting screening records.
              </p>
            </div>

            {/* Camp Search Bar */}
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <Search className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                placeholder="Search active camps by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-slate-50/50"
              />
            </div>

            {loadingPlaces ? (
              <div className="py-12 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading campsite registry...
              </div>
            ) : filteredPlaces.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                No matching active camps found. Contact Camp Coordinator.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin">
                {filteredPlaces.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveCampCode(p.shortCode);
                      toast({ title: "Camp Opened", description: `Campsite session ${p.name} activated.` });
                    }}
                    className="w-full text-left p-3.5 bg-white border border-slate-200 hover:border-orange-500 rounded-xl flex items-center justify-between transition-all group hover:bg-orange-50/20"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Code: {p.shortCode} • Type: {p.placeType}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#FF6B00] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg group-hover:bg-[#FF6B00] group-hover:text-white transition-colors">
                      Open Camp
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const activeCampName = places.find(p => p.shortCode === activeCampCode)?.name || activeCampCode;

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      {/* Camp session indicator banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs gap-3 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-orange-100 rounded-md flex items-center justify-center">
            <MapPin className="h-4 w-4 text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active Camp Session</p>
            <p className="text-xs font-extrabold text-slate-800">{activeCampName} ({activeCampCode})</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            onClick={() => {
              fetchVcReferrals();
              setVcModalOpen(true);
            }}
            className="bg-orange-50 hover:bg-orange-100 text-[#FF6B00] border border-orange-200 text-[10px] sm:text-xs h-8 font-bold px-3 rounded-lg flex items-center gap-1.5 shadow-none"
          >
            <User className="h-3.5 w-3.5" /> Referrals from VCs / ASHA Workers
          </Button>

          <Button
            onClick={() => {
              if (window.confirm("Switching camps will lock current entry. Switch?")) {
                setActiveCampCode(null);
              }
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] h-7 font-bold px-2.5 rounded-lg flex items-center gap-1 border border-slate-200 shadow-none"
          >
            <RefreshCw className="h-3 w-3" /> Change Camp
          </Button>

          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200">
            {isOnline ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-amber-500" />}
            <span>{isOnline ? "Online" : "Queue Mode"}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-6 max-w-3xl mx-auto">
        {/* Section 1: Demographics */}
        <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-[#FF6B00]/5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-[#FF6B00]" />
              <div>
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">Section 1: Patient Demographics</CardTitle>
                <CardDescription className="text-[10px]">Enter primary identification and contact metrics.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 text-xs">
            {/* Patient Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Patient Full Name *</label>
              <input
                type="text"
                placeholder="Enter patient full name"
                {...register("patientName")}
                onChange={(e) => handleFieldChange("patientName", e.target.value)}
                className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
              {errors.patientName && <p className="text-red-500 text-[10px] mt-1">{errors.patientName.message}</p>}
            </div>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age (Years) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 45"
                  {...register("age")}
                  onChange={(e) => handleFieldChange("age", e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
                {errors.age && <p className="text-red-500 text-[10px] mt-1">{errors.age.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Gender *</label>
                <div className="flex gap-2">
                  {GENDER_OPTIONS.map((g) => {
                    const currentGender = watch("gender");
                    const active = currentGender === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleFieldChange("gender", g)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all text-center ${
                          active 
                            ? "bg-orange-500 border-[#FF6B00] text-white shadow-sm" 
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
                {errors.gender && <p className="text-red-500 text-[10px] mt-1">{errors.gender.message}</p>}
              </div>
            </div>

            {/* Phone & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number (10 Digits) *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter 10-digit mobile number"
                  {...register("phone")}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
                {errors.phone && <p className="text-red-500 text-[10px] mt-1">{errors.phone.message}</p>}
                {duplicateWarning && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-amber-600 bg-amber-50 p-2 rounded-lg text-[10px] font-medium border border-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{duplicateWarning}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Address / Village *</label>
                <input
                  type="text"
                  placeholder="Village, town name"
                  {...register("address")}
                  onChange={(e) => handleFieldChange("address", e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
                {errors.address && <p className="text-red-500 text-[10px] mt-1">{errors.address.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Clinical Assessment */}
        <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-[#FF6B00]/5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Heart className="h-4.5 w-4.5 text-[#FF6B00]" />
              <div>
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">Section 2: Clinical Assessment</CardTitle>
                <CardDescription className="text-[10px]">Record key metabolic and physiological markers.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 uppercase mb-2">Diabetes Duration *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {DIABETES_DURATION_OPTIONS.map((d) => {
                  const currentDuration = watch("diabetesDuration");
                  const active = currentDuration === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleFieldChange("diabetesDuration", d)}
                      className={`py-3 px-3 text-xs sm:text-sm font-extrabold rounded-xl border transition-all text-center ${
                        active 
                          ? "bg-orange-500 border-[#FF6B00] text-white shadow-md scale-[1.02]" 
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              {errors.diabetesDuration && <p className="text-red-500 text-xs mt-1">{errors.diabetesDuration.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Blood Pressure (mmHg) (Optional)</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="SYS (e.g. 120)"
                    {...register("systolicBP")}
                    onChange={(e) => handleFieldChange("systolicBP", e.target.value)}
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <span className="text-slate-400 font-bold text-base">/</span>
                <div className="flex-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="DIA (e.g. 80)"
                    {...register("diastolicBP")}
                    onChange={(e) => handleFieldChange("diastolicBP", e.target.value)}
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-1">
                {errors.systolicBP && <p className="text-red-500 text-[10px]">{errors.systolicBP.message}</p>}
                {errors.diastolicBP && <p className="text-red-500 text-[10px]">{errors.diastolicBP.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Fundus Photography */}
        <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-[#FF6B00]/5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Camera className="h-4.5 w-4.5 text-[#FF6B00]" />
              <div>
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">Section 3: Fundus Photography</CardTitle>
                <CardDescription className="text-[10px]">Attach high-quality retinal images for diagnostic records.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 text-xs">
            <div className="border border-dashed border-slate-300 p-6 rounded-xl flex flex-col items-center justify-center text-center bg-slate-50 gap-3">
              <Camera className="h-8 w-8 text-slate-400" />
              <div>
                <p className="font-bold text-slate-700">Retinal Fundus Image</p>
                <p className="text-[10px] text-slate-400">Capture direct from ophthalmic camera attachment or select image file</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  type="button"
                  onClick={() => document.getElementById("camera-input")?.click()}
                  className="bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold h-9 text-xs rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <Camera className="h-4 w-4" /> Camera Capture
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem("vision2020_token");
                      const currentId = serialInfo?.uniqueId || "";
                      const res = await fetch(`/api/integrations/remidio/fetch?visitId=${encodeURIComponent(currentId)}&phone=${watch("phone") || ""}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (res.ok) {
                        const result = await res.json();
                        const odImg = result.data?.images?.[0]?.imageUrl || "placeholder_fundus.jpg";
                        setImagePreview(odImg);
                        toast({
                          title: "Remidio Camera Synced! 📸",
                          description: `Fetched fundus image from ${result.data?.deviceModel || "Remidio Camera"} (${result.data?.deviceSerial || "REM-FOP"}).`
                        });
                      }
                    } catch (err) {
                      toast({
                        title: "Remidio Sync",
                        description: "Could not fetch from Remidio Camera.",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 text-xs rounded-lg flex items-center gap-1 shadow-xs"
                >
                  <Activity className="h-4 w-4" /> Fetch from Remidio Camera
                </Button>
                <Button
                  type="button"
                  onClick={() => document.getElementById("file-input")?.click()}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold h-9 text-xs rounded-lg flex items-center gap-1"
                >
                  <Upload className="h-4 w-4" /> Upload File
                </Button>
              </div>

              <input
                id="camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
              />
              <input
                id="file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              {imagePreview && (
                <div className="relative mt-2">
                  <img
                    src={imagePreview}
                    alt="Fundus Thumbnail Preview"
                    className="h-28 w-28 object-cover rounded-lg border border-slate-200 cursor-pointer"
                    onClick={() => setFullscreenImage(imagePreview)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      handleFieldChange("imagePath", "");
                    }}
                    className="absolute -top-1.5 -right-1.5 p-1 bg-red-100 text-red-600 rounded-full border border-red-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Fundus quality selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fundus Image Quality</label>
              <div className="flex gap-2">
                {QUALITY_OPTIONS.map((q) => {
                  const currentQuality = watch("imageQuality");
                  const active = currentQuality === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleFieldChange("imageQuality", q)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        active 
                          ? "bg-orange-50 border-[#FF6B00] text-[#FF6B00]" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Diagnosis & Referral */}
        <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-[#FF6B00]/5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-[#FF6B00]" />
              <div>
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">Section 4: Diagnosis & Referral Actions</CardTitle>
                <CardDescription className="text-[10px]">Provide final diagnostics and base hospital recommendations.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 text-xs">
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 uppercase mb-2">DR Diagnosis *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {DR_STATUS_OPTIONS.map((dr) => {
                    const currentDr = watch("drStatus");
                    const active = currentDr === dr;
                    return (
                      <button
                        key={dr}
                        type="button"
                        onClick={() => handleFieldChange("drStatus", dr)}
                        className={`py-3 px-3.5 text-xs sm:text-sm font-extrabold rounded-xl border transition-all text-center ${
                          active 
                            ? "bg-orange-500 border-[#FF6B00] text-white shadow-md scale-[1.02]" 
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {dr}
                      </button>
                    );
                  })}
                </div>
                {errors.drStatus && <p className="text-red-500 text-xs mt-1">{errors.drStatus.message}</p>}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 uppercase mb-2">Advice / Action Plan *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ADVICE_OPTIONS.map((a) => {
                    const currentAdvice = watch("advice");
                    const active = currentAdvice === a;
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => handleFieldChange("advice", a)}
                        className={`py-3 px-4 text-xs sm:text-sm font-extrabold rounded-xl border transition-all text-left ${
                          active 
                            ? "bg-orange-500 border-[#FF6B00] text-white shadow-md scale-[1.01]" 
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
                {errors.advice && <p className="text-red-500 text-xs mt-1">{errors.advice.message}</p>}

                {watch("advice") === "Others" && (
                  <div className="mt-3 p-3 bg-orange-50/70 border border-orange-200 rounded-xl space-y-1.5 animate-fadeIn">
                    <label className="block text-xs font-extrabold text-orange-900 uppercase">
                      Specify Other Advice / Custom Action Plan *
                    </label>
                    <input
                      type="text"
                      required
                      value={watch("otherAdvice") || ""}
                      onChange={(e) => handleFieldChange("otherAdvice", e.target.value)}
                      placeholder="Type custom advice (e.g. Cataract surgery referral, Refraction & glasses, Glaucoma evaluation)..."
                      className="w-full text-xs border border-orange-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#FF6B00] font-semibold text-slate-900"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Refer to Base Hospital checkbox & Remarks */}
            <div className="bg-red-50/50 border border-red-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-800 flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4 text-red-600" /> Refer to Base Hospital
                  </p>
                  <p className="text-[10px] text-slate-500 max-w-md">
                    Flag patient for urgent referral to Sankara Eye Hospital for diagnostic confirmation.
                  </p>
                </div>
                <input
                  type="checkbox"
                  {...register("referToBaseHospital")}
                  onChange={(e) => handleFieldChange("referToBaseHospital", e.target.checked)}
                  className="h-5 w-5 rounded-md border-slate-300 text-red-600 focus:ring-red-500 bg-white cursor-pointer"
                />
              </div>

              {watch("referToBaseHospital") && (
                <div className="pt-2 border-t border-red-200/60 space-y-1">
                  <label className="block text-xs font-bold text-red-900">
                    Base Hospital Referral Remarks / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={watch("baseHospitalRemarks") || ""}
                    onChange={(e) => handleFieldChange("baseHospitalRemarks", e.target.value)}
                    placeholder="Enter reason for referral to Base Hospital, transport notes, or specific surgical advice..."
                    className="w-full text-xs border border-red-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-red-500 font-medium text-slate-800"
                  />
                </div>
              )}
            </div>

            {/* General Screening Remarks / Clinical Notes */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 uppercase flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#FF6B00]" /> General Screening Remarks / Clinical Notes
              </label>
              <textarea
                rows={2}
                value={watch("remarks") || ""}
                onChange={(e) => handleFieldChange("remarks", e.target.value)}
                placeholder="Enter general observations, patient history, systemic findings, or clinical comments..."
                className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#FF6B00] font-medium text-slate-800"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isUploading}
            className="flex-1 bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white font-bold h-11 text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md"
          >
            <Save className="h-4.5 w-4.5" />
            {isUploading ? "Uploading record..." : "Save Patient Screening"}
          </Button>
        </div>
      </form>

      {/* Fullscreen zoom modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 text-white hover:bg-white/20 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={fullscreenImage}
            alt="Fullscreen Preview"
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />
        </div>
      )}

      {/* VC & ASHA Referrals Picker Modal */}
      {vcModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <CardHeader className="flex flex-row justify-between items-center py-4 border-b border-slate-100 bg-orange-50/50">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Referred Patients (VCs & ASHA Workers)</CardTitle>
                <CardDescription className="text-[11px]">Active DR Camp: {activeCampName} ({activeCampCode})</CardDescription>
              </div>
              <button onClick={() => setVcModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <CardContent className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {loadingVcReferrals ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading referred patients...</div>
              ) : vcReferrals.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  No pending patient referrals found for camp {activeCampCode}.
                </div>
              ) : (
                vcReferrals.map((item) => {
                  const isAsha = item.referrerType === "asha_worker";
                  return (
                    <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-[#FF6B00] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{item.patientName}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isAsha ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {isAsha ? "ASHA Worker" : "Vision Center"}
                          </span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                            {item.age} yrs • {item.gender}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 font-medium">
                          📞 {item.phone} {item.address ? `• 📍 ${item.address}` : ""}
                        </p>

                        <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-semibold">
                          <span>Source: <strong className="text-slate-800">{isAsha ? item.phcName || "ASHA Worker" : item.visionCenterName || item.visionCenterCode}</strong> ({item.referralDate})</span>
                          {item.randomBloodSugar && (
                            <span className="text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              RBS: {item.randomBloodSugar} mg/dL
                            </span>
                          )}
                        </div>

                        {item.drNotes && (
                          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 p-1.5 rounded mt-1 font-mono">
                            Notes: {item.drNotes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <Button
                          onClick={() => handleApplyReferral(item)}
                          className="bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white text-xs font-bold px-3 h-8 rounded-lg shadow-xs"
                        >
                          Fill Screening Form
                        </Button>
                        <Button
                          onClick={() => handleMarkNoShow(item)}
                          variant="outline"
                          className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-bold px-2.5 h-8 rounded-lg"
                        >
                          Did Not Attend
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setVcModalOpen(false)} variant="outline" className="text-xs h-8">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
