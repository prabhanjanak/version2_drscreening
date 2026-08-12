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
  alternatePhone: z.string().optional().default(""),
  referralSource: z.string().default("ASHA Worker / ANM Outreach"),
  diabetesDuration: z.string().min(1, "Duration of diabetes is required"),
  diabetesMeasureType: z.string().default("GRBS (mg/dL)"),
  diabetesMeasureValue: z.string().optional().default(""),
  grbsRecordedBy: z.string().default("CHC / PHC Staff"),
  chcPhcCenterName: z.string().optional().default(""),
  systolicBP: z.string().optional().default(""),
  diastolicBP: z.string().optional().default(""),
  drStatus: z.string().min(1, "DR Status is required"),
  hasCataract: z.string().default("None"),
  cataractPlanning: z.string().optional().default(""),
  fundusCaptured: z.boolean().default(true),
  fundusNotCapturedReason: z.string().optional().default(""),
  advice: z.string().min(1, "Advice is required"),
  imageQuality: z.string().default("Good"),
  referToBaseHospital: z.boolean().default(false),
  baseHospitalRemarks: z.string().optional().default(""),
  otherAdvice: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  referredToGiftOfVision: z.boolean().default(false),
  giftOfVisionNotes: z.string().optional().default(""),
  govtSchemes: z.array(z.string()).default([]),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type FormValues = z.infer<typeof screeningFormSchema>;

const GENDER_OPTIONS = ["Male", "Female", "Other"];

const REFERRAL_SOURCE_OPTIONS = [
  "ASHA Worker / ANM Outreach",
  "Vision Center / PHC / CHC",
  "Gram Panchayat Announcement (Tandora)",
  "Pamphlet / Poster / Banner",
  "Family / Friends / Word of Mouth",
  "Previous Camp Attendee",
  "Doctor / Hospital Referral",
  "Other / Walk-in",
];

const DIABETES_MEASURE_TYPES = [
  "GRBS (mg/dL)",
  "RBS (mg/dL)",
  "FBS (Fasting)",
  "PPBS (Postprandial)",
  "HbA1c (%)",
];

const GRBS_STAFF_OPTIONS = [
  "CHC / PHC Staff",
  "ASHA / ANM Worker",
  "Camp Lab Technician",
  "Optometrist / Screener",
];

const CATARACT_OPTIONS = [
  "None",
  "Immature Cataract",
  "Mature Cataract",
  "Hypermature Cataract",
];

const CATARACT_PLANNING_OPTIONS = [
  "Scheduled for Next Cataract Camp",
  "Base Hospital Surgery Referred",
  "Transport Required to Sankara",
  "Counseling Completed",
];

const FUNDUS_NOT_CAPTURED_REASONS = [
  "Pupil not dilated",
  "Dense Cataract / Media Opacity",
  "Patient uncooperative",
  "Remidio at Base Hospital",
  "Equipment issue / Power outage",
];

const KARNATAKA_SCHEMES_OPTIONS = [
  "Ayushman Bharat - Arogya Karnataka (AB-ArK)",
  "BPL Card (Below Poverty Line)",
  "APL Card (Above Poverty Line)",
  "E-Shram Card",
  "Yeshasvini Health Insurance Scheme",
  "Senior Citizen Card / Sandhya Suraksha",
  "Sankara Gift of Vision Sponsorship",
  "Private Health Insurance",
  "None / General Self-Pay",
];

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
  const [appliedReferralId, setAppliedReferralId] = useState<number | null>(null);

  // Camp search query
  const [searchQuery, setSearchQuery] = useState("");
  const patientNameRef = useRef<HTMLInputElement | null>(null);

  const fetchVcReferrals = async () => {
    if (!activeCampCode) return;
    setLoadingVcReferrals(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/vc-referrals?targetCampCode=${encodeURIComponent(activeCampCode)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVcReferrals(data);
      }
    } catch (err) {
      console.error("Failed to load pre-referrals:", err);
    } finally {
      setLoadingVcReferrals(false);
    }
  };

  useEffect(() => {
    if (activeCampCode) {
      fetchVcReferrals();
    }
  }, [activeCampCode]);

  const handleApplyReferral = (refItem: any) => {
    setAppliedReferralId(refItem.id);
    setValue("patientName", refItem.patientName);
    setValue("age", Number(refItem.age));
    setValue("gender", refItem.gender);
    setValue("phone", refItem.phone === "N/A" ? "" : refItem.phone);
    if (refItem.address || refItem.village) setValue("address", refItem.address || refItem.village);
    if (refItem.randomBloodSugar || refItem.bloodSugar) {
      setValue("diabetesMeasureValue", refItem.randomBloodSugar || refItem.bloodSugar);
      setValue("diabetesMeasureType", "GRBS (mg/dL)");
    }
    if (refItem.phcName) {
      setValue("chcPhcCenterName", refItem.phcName);
      setValue("grbsRecordedBy", "CHC / PHC Staff");
    }
    if (refItem.referrerType === "asha_worker") {
      setValue("referralSource", "ASHA Worker / ANM Outreach");
    } else if (refItem.referrerType === "ophthalmic_officer") {
      setValue("referralSource", "Doctor / Hospital Referral");
    } else {
      setValue("referralSource", "Vision Center / PHC / CHC");
    }
    const combinedNotes = [
      refItem.symptoms ? `Referred Symptoms: ${refItem.symptoms}` : "",
      refItem.drNotes ? `Clinical Notes: ${refItem.drNotes}` : "",
    ].filter(Boolean).join(" | ");
    if (combinedNotes) setValue("remarks", combinedNotes);

    toast({
      title: "Pre-Referral Loaded! 📋",
      description: `Auto-filled details for ${refItem.patientName} referred by ${refItem.referrerType === 'asha_worker' ? (refItem.phcName || 'ASHA Worker') : refItem.referrerType === 'ophthalmic_officer' ? 'Ophthalmic Officer' : (refItem.visionCenterName || refItem.visionCenterCode)}.`
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

  const { register, handleSubmit, watch, setValue, reset, resetField, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(screeningFormSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      screeningPlaceCode: activeCampCode || "",
      patientName: "",
      age: 45,
      gender: "Male",
      address: "",
      phone: "",
      alternatePhone: "",
      referralSource: "ASHA Worker / ANM Outreach",
      diabetesDuration: "Newly Diagnosed",
      diabetesMeasureType: "GRBS (mg/dL)",
      diabetesMeasureValue: "",
      grbsRecordedBy: "CHC / PHC Staff",
      chcPhcCenterName: "",
      systolicBP: "",
      diastolicBP: "",
      drStatus: "No DR",
      hasCataract: "None",
      cataractPlanning: "",
      fundusCaptured: true,
      fundusNotCapturedReason: "",
      advice: "Annual Review",
      imageQuality: "Good",
      referToBaseHospital: false,
      baseHospitalRemarks: "",
      otherAdvice: "",
      remarks: "",
      referredToGiftOfVision: false,
      giftOfVisionNotes: "",
      govtSchemes: [],
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

  // Load all places from registry with offline fallback
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const token = localStorage.getItem("vision2020_token");
        const res = await fetch("/api/screening-places", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPlaces(data);
          localStorage.setItem("cached_places", JSON.stringify(data));
        } else {
          throw new Error("Network response not ok");
        }
      } catch (err) {
        console.error("Offline fallback: Loading cached screening places", err);
        const cached = localStorage.getItem("cached_places");
        if (cached) {
          const data = JSON.parse(cached);
          setPlaces(data);
        }
      } finally {
        setLoadingPlaces(false);
      }
    };
    fetchPlaces();

    // Check URL search parameters for pre-selected camp (e.g. /patients/new?camp=SANK01)
    const urlParams = new URLSearchParams(window.location.search);
    const urlCamp = urlParams.get("camp") || urlParams.get("place");
    if (urlCamp) {
      setActiveCampCode(urlCamp.toUpperCase());
      setValue("screeningPlaceCode", urlCamp.toUpperCase());
    }

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

  // Sync camp code and camp date
  useEffect(() => {
    if (activeCampCode) {
      setValue("screeningPlaceCode", activeCampCode);
      localStorage.setItem("activeCampCode", activeCampCode);
      const camp = places.find(p => p.shortCode === activeCampCode);
      if (camp) {
        const cDate = camp.campDate || (camp.createdAt ? new Date(camp.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
        setValue("date", cDate);
      }
    } else {
      localStorage.removeItem("activeCampCode");
    }
  }, [activeCampCode, places, setValue]);

  // Load Next Serial using camp date
  useEffect(() => {
    if (!selectedPlace) return;
    const camp = places.find(p => p.shortCode === selectedPlace);
    const effectiveDate = camp?.campDate || (camp?.createdAt ? new Date(camp.createdAt).toISOString().split("T")[0] : selectedDate || new Date().toISOString().split("T")[0]);
    
    const fetchSerial = async () => {
      try {
        const token = localStorage.getItem("vision2020_token");
        const res = await fetch(`/api/patients/next-serial?placeCode=${selectedPlace}&date=${effectiveDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSerialInfo(data);
          if (data.campDate) {
            setValue("date", data.campDate);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSerial();
  }, [selectedPlace, selectedDate, places, setValue]);

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
      const activeCampObj = places.find(p => p.shortCode === (activeCampCode || values.screeningPlaceCode));
      const campEffectiveDate = activeCampObj?.campDate || (activeCampObj?.createdAt ? new Date(activeCampObj.createdAt).toISOString().split("T")[0] : values.date || new Date().toISOString().split("T")[0]);

      try {
        await offlineDB.addEntry(offlineEntry);
        offlineDB.clearDraft();
        setImageFile(null);
        setImagePreview(null);
        reset({
          date: campEffectiveDate,
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
          baseHospitalRemarks: "",
          otherAdvice: "",
          remarks: "",
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

      const activeCampObj = places.find(p => p.shortCode === (activeCampCode || values.screeningPlaceCode));
      const campEffectiveDate = activeCampObj?.campDate || (activeCampObj?.createdAt ? new Date(activeCampObj.createdAt).toISOString().split("T")[0] : values.date || new Date().toISOString().split("T")[0]);

      const bloodPressureStr = (values.systolicBP?.trim() || values.diastolicBP?.trim()) ? `${values.systolicBP || ""}/${values.diastolicBP || ""}` : null;
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: campEffectiveDate,
          screeningPlaceCode: values.screeningPlaceCode,
          name: values.patientName,
          age: values.age,
          gender: values.gender,
          address: values.address,
          phone: values.phone,
          alternatePhone: values.alternatePhone,
          referralSource: values.referralSource,
          diabetesDuration: values.diabetesDuration,
          diabetesMeasureType: values.diabetesMeasureType,
          diabetesMeasureValue: values.diabetesMeasureValue,
          grbsRecordedBy: values.grbsRecordedBy,
          chcPhcCenterName: values.chcPhcCenterName,
          bloodPressure: bloodPressureStr,
          drStatus: values.drStatus,
          hasCataract: values.hasCataract,
          cataractPlanning: values.cataractPlanning,
          fundusCaptured: values.fundusCaptured,
          fundusNotCapturedReason: values.fundusNotCapturedReason,
          advice: values.advice === "Others" && values.otherAdvice?.trim() ? `Others: ${values.otherAdvice.trim()}` : values.advice,
          imagePath: remoteImagePath,
          imageQuality: values.imageQuality,
          latitude: values.latitude,
          longitude: values.longitude,
          referralStatus: "Referred",
          referToBaseHospital: values.referToBaseHospital,
          baseHospitalRemarks: values.baseHospitalRemarks,
          remarks: values.remarks,
          referredToGiftOfVision: values.referredToGiftOfVision,
          giftOfVisionNotes: values.giftOfVisionNotes,
          govtSchemes: values.govtSchemes,
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save record");
      }

      const resData = await res.json().catch(() => ({}));

      // If this screening was populated from an Ophthalmic/ASHA referral, auto-convert the referral
      if (appliedReferralId) {
        try {
          await fetch(`/api/vc-referrals/${appliedReferralId}/convert`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ convertedPatientId: resData?.patient?.id })
          });
          setAppliedReferralId(null);
        } catch (convErr) {
          console.error("Auto-convert referral error:", convErr);
        }
      }

      await offlineDB.clearDraft();
      setImageFile(null);
      setImagePreview(null);
      reset({
        date: campEffectiveDate,
        screeningPlaceCode: activeCampCode || "",
        patientName: "",
        age: 45,
        gender: "Male",
        address: "",
        phone: "",
        alternatePhone: "",
        referralSource: "ASHA Worker / ANM Outreach",
        diabetesDuration: "Newly Diagnosed",
        diabetesMeasureType: "GRBS (mg/dL)",
        diabetesMeasureValue: "",
        grbsRecordedBy: "CHC / PHC Staff",
        chcPhcCenterName: "",
        systolicBP: "",
        diastolicBP: "",
        drStatus: "No DR",
        hasCataract: "None",
        cataractPlanning: "",
        fundusCaptured: true,
        fundusNotCapturedReason: "",
        advice: "Annual Review",
        imageQuality: "Good",
        referToBaseHospital: false,
        baseHospitalRemarks: "",
        otherAdvice: "",
        remarks: "",
        referredToGiftOfVision: false,
        giftOfVisionNotes: "",
        govtSchemes: [],
        latitude: "",
        longitude: ""
      });
      toast({ 
        title: "Patient Screened Successfully! 🩺", 
        description: `Saved to camp ${activeCampCode} on ${campEffectiveDate}. ID: ${resData?.patient?.uniqueId || ""}` 
      });
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

  const toggleGovtScheme = (scheme: string) => {
    const current = watch("govtSchemes") || [];
    const updated = current.includes(scheme)
      ? current.filter((s: string) => s !== scheme)
      : [...current, scheme];
    handleFieldChange("govtSchemes", updated);
  };

  // Filter places based on search query
  const filteredPlaces = places.filter(
    (p) =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.district && p.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.taluk && p.taluk.toLowerCase().includes(searchQuery.toLowerCase()))
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
                Select and open the active campsite ({places.length} Camps Available) before collecting screening records.
              </p>
            </div>

            {/* Camp Search Bar */}
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <Search className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                placeholder="Search camps by name, code, taluk, or district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00] bg-slate-50/50 font-medium"
              />
            </div>

            {loadingPlaces ? (
              <div className="py-12 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading campsite registry...
              </div>
            ) : filteredPlaces.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                No matching camps found. Try clearing search query or register a new campsite.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin">
                {filteredPlaces.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const cDate = p.campDate || (p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
                      setActiveCampCode(p.shortCode);
                      setValue("screeningPlaceCode", p.shortCode);
                      setValue("date", cDate);
                      toast({ title: "Camp Opened", description: `Campsite session ${p.name} activated for camp date ${cDate}.` });
                    }}
                    className="w-full text-left p-3.5 bg-white border border-slate-200 hover:border-orange-500 rounded-xl flex items-center justify-between transition-all group hover:bg-orange-50/20"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800">{p.name}</p>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                          p.status === "completed" 
                            ? "bg-slate-100 text-slate-600 border-slate-200" 
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {p.status === "completed" ? "Completed" : "Active / Scheduled"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Code: <strong className="font-mono text-slate-700">{p.shortCode}</strong> • {p.taluk || p.district || "Karnataka"} • Date: <strong className="text-orange-600">{p.campDate || (p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : "Today")}</strong>
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#FF6B00] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg group-hover:bg-[#FF6B00] group-hover:text-white transition-colors shrink-0">
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

  const activeCamp = places.find(p => p.shortCode === activeCampCode);
  const activeCampName = activeCamp?.name || activeCampCode;
  const activeCampDate = activeCamp?.campDate || (activeCamp?.createdAt ? new Date(activeCamp.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);

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
            <p className="text-xs font-extrabold text-slate-800">
              {activeCampName} ({activeCampCode}) • <span className="text-[#FF6B00] font-mono font-bold">📅 Camp Date: {activeCampDate}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            type="button"
            onClick={() => {
              setActiveCampCode(null);
              localStorage.removeItem("activeCampCode");
              setValue("screeningPlaceCode", "");
            }}
            variant="outline"
            className="text-[10px] sm:text-xs h-8 font-bold px-3 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1 shadow-2xs"
          >
            <MapPin className="h-3.5 w-3.5 text-[#FF6B00]" /> Switch Camp
          </Button>

          <Button
            onClick={() => {
              fetchVcReferrals();
              setVcModalOpen(true);
            }}
            className="bg-orange-50 hover:bg-orange-100 text-[#FF6B00] border border-orange-200 text-[10px] sm:text-xs h-8 font-bold px-3 rounded-lg flex items-center gap-1.5 shadow-none"
          >
            <User className="h-3.5 w-3.5" /> Referrals
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
        
        {/* ========================================================================= */}
        {/* STATION 1: PATIENT REGISTRATION & AWARENESS INTAKE                       */}
        {/* ========================================================================= */}
        <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-[#FF6B00]/5 py-3.5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-[#FF6B00] text-white text-xs font-black flex items-center justify-center">1</span>
                <div>
                  <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Station 1: Patient Registration & Referral Source
                  </CardTitle>
                  <CardDescription className="text-[10px]">Demographic details, awareness referral source & government scheme eligibility.</CardDescription>
                </div>
              </div>
              {serialInfo?.uniqueId && (
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Assigned ID (Camp Date)</span>
                  <span className="font-mono text-xs font-extrabold text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 shadow-2xs">
                    {serialInfo.uniqueId}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 text-xs">
            
            {/* Pre-Referred Patient Fast-Selector Banner */}
            {appliedReferralId ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-emerald-900">
                      Pre-Referral Auto-Filled: <span className="underline">{watch("patientName")}</span>
                    </p>
                    <p className="text-[10px] text-emerald-700 font-medium">
                      Patient demographics & glucose level imported. Will auto-mark referral as screened on submission.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAppliedReferralId(null);
                    resetField("patientName");
                    resetField("phone");
                    resetField("address");
                    resetField("diabetesMeasureValue");
                    resetField("remarks");
                    toast({ title: "Pre-referral unlinked", description: "Form fields cleared." });
                  }}
                  className="text-[10px] h-7 border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold rounded-lg shrink-0"
                >
                  <X className="h-3 w-3 mr-1" /> Unlink Referral
                </Button>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-[#FF6B00] shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-slate-800">
                      Pre-Referred Camp Patients:
                    </span>{" "}
                    <span className="text-[11px] font-extrabold text-[#FF6B00]">
                      {vcReferrals.filter(r => r.status === "pending").length} Awaiting Screening
                    </span>
                    <p className="text-[9px] text-slate-500 font-medium">
                      Referred by Ophthalmic Officers, Vision Centers & ASHA Workers for this camp ({activeCampCode}).
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    fetchVcReferrals();
                    setVcModalOpen(true);
                  }}
                  className="bg-[#FF6B00] hover:bg-orange-600 text-white font-bold text-[10px] h-7 px-3 rounded-lg shadow-2xs shrink-0 flex items-center gap-1"
                >
                  <User className="h-3 w-3" /> Select Pre-Referred Patient ({vcReferrals.filter(r => r.status === "pending").length})
                </Button>
              </div>
            )}

            {/* Patient Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Patient Full Name *</label>
              <input
                type="text"
                placeholder="Enter patient full name"
                {...register("patientName")}
                onChange={(e) => handleFieldChange("patientName", e.target.value)}
                className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] font-semibold"
              />
              {errors.patientName && <p className="text-red-500 text-[10px] mt-1">{errors.patientName.message}</p>}
            </div>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Age (Years) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 45"
                  {...register("age")}
                  onChange={(e) => handleFieldChange("age", e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] font-semibold"
                />
                {errors.age && <p className="text-red-500 text-[10px] mt-1">{errors.age.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">Gender *</label>
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
                            ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-sm" 
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

            {/* Primary Phone & Alternate Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Primary Mobile Number (10 Digits) *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter 10-digit mobile number"
                  {...register("phone")}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00] font-semibold"
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
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Alternate Mobile Number (Optional - Attendant / Relative)
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Optional alternate / family phone number"
                  {...register("alternatePhone")}
                  onChange={(e) => handleFieldChange("alternatePhone", e.target.value)}
                  className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>
            </div>

            {/* Address & Village */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Address / Village / Taluk *</label>
              <input
                type="text"
                placeholder="Enter village, street, town or taluk name"
                {...register("address")}
                onChange={(e) => handleFieldChange("address", e.target.value)}
                className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
              {errors.address && <p className="text-red-500 text-[10px] mt-1">{errors.address.message}</p>}
            </div>

            {/* Referral / Awareness Source */}
            <div className="bg-orange-50/40 p-3.5 rounded-xl border border-orange-100 space-y-2">
              <label className="block text-[11px] font-black text-orange-950 uppercase flex items-center gap-1.5">
                📢 How did the patient learn about this DR Camp? (Referral Source)
              </label>
              <select
                value={watch("referralSource")}
                onChange={(e) => handleFieldChange("referralSource", e.target.value)}
                className="w-full text-xs border border-orange-200 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#FF6B00] font-semibold text-slate-800"
              >
                {REFERRAL_SOURCE_OPTIONS.map((src) => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>

            {/* Karnataka Govt Schemes / Insurance Eligibility */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-[11px] font-black text-slate-800 uppercase">
                🏛️ Government Provided Facilities & Insurance Schemes (Karnataka)
              </label>
              <p className="text-[10px] text-slate-500">Select all scheme cards or benefits the patient currently holds:</p>
              <div className="flex flex-wrap gap-1.5">
                {KARNATAKA_SCHEMES_OPTIONS.map((scheme) => {
                  const selectedSchemes = watch("govtSchemes") || [];
                  const isSelected = selectedSchemes.includes(scheme);
                  return (
                    <button
                      key={scheme}
                      type="button"
                      onClick={() => toggleGovtScheme(scheme)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                        isSelected 
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs" 
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}{scheme}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Referred to Gift of Vision Free Sponsorship */}
            <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    🎁 Referred to Gift of Vision (Free Sankara Eye Foundation Sponsorship)
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    Flag patient for 100% free surgical care, food, and transport sponsorship under Gift of Vision.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={watch("referredToGiftOfVision")}
                  onChange={(e) => handleFieldChange("referredToGiftOfVision", e.target.checked)}
                  className="h-5 w-5 rounded-md border-emerald-300 text-emerald-600 focus:ring-emerald-500 bg-white cursor-pointer"
                />
              </div>

              {watch("referredToGiftOfVision") && (
                <div className="pt-2 border-t border-emerald-200 space-y-1">
                  <input
                    type="text"
                    placeholder="Enter Gift of Vision sponsorship notes (e.g. BPL beneficiary, village transport arranged)..."
                    value={watch("giftOfVisionNotes") || ""}
                    onChange={(e) => handleFieldChange("giftOfVisionNotes", e.target.value)}
                    className="w-full text-xs border border-emerald-300 p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* ========================================================================= */}
        {/* STATION 2: CHC / PHC LAB & DIABETIC VITALS STATION                        */}
        {/* ========================================================================= */}
        <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-[#FF6B00]/5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-[#FF6B00] text-white text-xs font-black flex items-center justify-center">2</span>
              <div>
                <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Station 2: CHC / PHC Lab & Diabetic Vitals
                </CardTitle>
                <CardDescription className="text-[10px]">Blood glucose testing (GRBS/RBS/HbA1c) conducted by CHC people & blood pressure.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 text-xs">
            
            {/* Diabetes Duration */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Duration of Diabetes *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {DIABETES_DURATION_OPTIONS.map((d) => {
                  const currentDuration = watch("diabetesDuration");
                  const active = currentDuration === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleFieldChange("diabetesDuration", d)}
                      className={`py-2 px-2 text-xs font-extrabold rounded-xl border transition-all text-center ${
                        active 
                          ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-xs scale-[1.02]" 
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

            {/* GRBS & Glucose Measurement Input */}
            <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
                  🩸 Diabetic Measure & Lab Input (Done by CHC People)
                </label>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  CHC Laboratory Protocol
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Test Measure Type</label>
                  <select
                    value={watch("diabetesMeasureType")}
                    onChange={(e) => handleFieldChange("diabetesMeasureType", e.target.value)}
                    className="w-full text-xs border border-indigo-200 p-2 rounded-lg bg-white font-bold text-indigo-900"
                  >
                    {DIABETES_MEASURE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Glucose Value ({watch("diabetesMeasureType") || "mg/dL"})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 185 mg/dL or 8.2%"
                    value={watch("diabetesMeasureValue") || ""}
                    onChange={(e) => handleFieldChange("diabetesMeasureValue", e.target.value)}
                    className="w-full text-xs border border-indigo-300 p-2 rounded-lg bg-white font-extrabold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">GRBS Conducted By</label>
                  <select
                    value={watch("grbsRecordedBy")}
                    onChange={(e) => handleFieldChange("grbsRecordedBy", e.target.value)}
                    className="w-full text-xs border border-indigo-200 p-2 rounded-lg bg-white font-medium text-slate-800"
                  >
                    {GRBS_STAFF_OPTIONS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  CHC / PHC Center Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anugodu CHC / Channagiri PHC"
                  value={watch("chcPhcCenterName") || ""}
                  onChange={(e) => handleFieldChange("chcPhcCenterName", e.target.value)}
                  className="w-full text-xs border border-indigo-200 p-2 rounded-lg bg-white font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Blood Pressure */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Blood Pressure (mmHg) (Optional)</label>
              <div className="flex items-center gap-2 max-w-sm">
                <div className="flex-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="SYS (e.g. 120)"
                    {...register("systolicBP")}
                    onChange={(e) => handleFieldChange("systolicBP", e.target.value)}
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] font-semibold"
                  />
                </div>
                <span className="text-slate-400 font-bold text-base">/</span>
                <div className="flex-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="DIA (e.g. 80)"
                    {...register("diastolicBP")}
                    onChange={(e) => handleFieldChange("diastolicBP", e.target.value)}
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] font-semibold"
                  />
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ========================================================================= */}
        {/* STATION 3: OPHTHALMIC ASSESSMENT, CATARACT SEGREGATION & DR PLAN          */}
        {/* ========================================================================= */}
        <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-[#FF6B00]/5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-[#FF6B00] text-white text-xs font-black flex items-center justify-center">3</span>
              <div>
                <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Station 3: Ophthalmic & DR Clinical Assessment
                </CardTitle>
                <CardDescription className="text-[10px]">Fundus capture toggle, DR staging, Cataract segregation, and action plan.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 text-xs">
            
            {/* Fundus Captured Toggle: YES / NO */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-[#FF6B00]" /> Retinal Fundus Image Taken? *
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Select YES if retinal photo was taken at the camp, or NO if uncaptured / deferred.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleFieldChange("fundusCaptured", true)}
                    className={`px-4 py-1.5 text-xs font-black rounded-lg border transition-all ${
                      watch("fundusCaptured") 
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs" 
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    YES (Image Taken)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleFieldChange("fundusCaptured", false);
                      setImageFile(null);
                      setImagePreview(null);
                      handleFieldChange("imagePath", "");
                    }}
                    className={`px-4 py-1.5 text-xs font-black rounded-lg border transition-all ${
                      !watch("fundusCaptured") 
                        ? "bg-amber-600 border-amber-600 text-white shadow-2xs" 
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    NO (Not Taken)
                  </button>
                </div>
              </div>

              {/* If NOT captured, ask for reason */}
              {!watch("fundusCaptured") && (
                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <label className="block text-[10px] font-bold text-amber-900 uppercase">
                    Reason Fundus Image Was Not Taken *
                  </label>
                  <select
                    value={watch("fundusNotCapturedReason") || ""}
                    onChange={(e) => handleFieldChange("fundusNotCapturedReason", e.target.value)}
                    className="w-full text-xs border border-amber-300 p-2 rounded-lg bg-white font-semibold text-slate-800"
                  >
                    <option value="">Select reason...</option>
                    {FUNDUS_NOT_CAPTURED_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* If YES captured, show high-resolution Image Upload Panel */}
              {watch("fundusCaptured") && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="border-2 border-dashed border-orange-200 bg-orange-50/30 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-3">
                    {!imagePreview ? (
                      <>
                        <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-[#FF6B00]">
                          <Camera className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Upload High-Resolution Retinal Fundus Photo</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            High-definition retinal images are automatically scaled to full resolution and fitted properly.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center pt-1">
                          <Button
                            type="button"
                            onClick={() => document.getElementById("camera-input")?.click()}
                            className="bg-[#FF6B00] hover:bg-orange-600 text-white font-bold h-8 text-xs rounded-lg flex items-center gap-1.5 shadow-2xs"
                          >
                            <Camera className="h-3.5 w-3.5" /> Camera Capture
                          </Button>
                          <Button
                            type="button"
                            onClick={() => document.getElementById("file-input")?.click()}
                            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold h-8 text-xs rounded-lg flex items-center gap-1.5 shadow-2xs"
                          >
                            <Upload className="h-3.5 w-3.5" /> Select Image File
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex flex-col items-center gap-3">
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 p-1 shadow-md max-w-sm w-full">
                          <img
                            src={imagePreview}
                            alt="Fundus Full Resolution Preview"
                            className="w-full h-56 object-contain rounded-lg cursor-pointer"
                            onClick={() => setFullscreenImage(imagePreview)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                              handleFieldChange("imagePath", "");
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-full shadow-md"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Full Resolution Fitted ✓
                          </span>
                          <Button
                            type="button"
                            onClick={() => document.getElementById("file-input")?.click()}
                            variant="outline"
                            className="h-7 text-[10px] font-bold border-slate-300 bg-white"
                          >
                            Replace Image
                          </Button>
                        </div>
                      </div>
                    )}

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
                  </div>
                </div>
              )}
            </div>

            {/* DR Diagnosis Staging */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">DR Diagnosis & Stage *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DR_STATUS_OPTIONS.map((dr) => {
                  const currentDr = watch("drStatus");
                  const active = currentDr === dr;
                  return (
                    <button
                      key={dr}
                      type="button"
                      onClick={() => handleFieldChange("drStatus", dr)}
                      className={`py-2.5 px-3 text-xs font-extrabold rounded-xl border transition-all text-center ${
                        active 
                          ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-xs scale-[1.02]" 
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

            {/* Cataract Segregation & Future Camp Planning */}
            <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-amber-950 uppercase flex items-center gap-1.5">
                  👁️ Cataract Segregation & Future Camp Planning
                </label>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Surgical Segregation
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Cataract Evaluation</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATARACT_OPTIONS.map((cat) => {
                    const currentCat = watch("hasCataract") || "None";
                    const isSelected = currentCat === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleFieldChange("hasCataract", cat)}
                        className={`py-2 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                          isSelected 
                            ? "bg-amber-700 border-amber-700 text-white shadow-2xs" 
                            : "bg-white border-amber-200 text-slate-700 hover:bg-amber-50"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* If Cataract is present, plan how to bring them */}
              {watch("hasCataract") && watch("hasCataract") !== "None" && (
                <div className="pt-2 border-t border-amber-200/60 space-y-1.5 animate-fadeIn">
                  <label className="block text-[10px] font-bold text-amber-900 uppercase">
                    Future Camp / Surgery Planning Action *
                  </label>
                  <select
                    value={watch("cataractPlanning") || ""}
                    onChange={(e) => handleFieldChange("cataractPlanning", e.target.value)}
                    className="w-full text-xs border border-amber-300 p-2.5 rounded-lg bg-white font-semibold text-slate-800"
                  >
                    <option value="">Select future camp planning action...</option>
                    {CATARACT_PLANNING_OPTIONS.map((cp) => (
                      <option key={cp} value={cp}>{cp}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Advice / Action Plan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Advice & Action Plan *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ADVICE_OPTIONS.map((a) => {
                  const currentAdvice = watch("advice");
                  const active = currentAdvice === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => handleFieldChange("advice", a)}
                      className={`py-2.5 px-3 text-xs font-extrabold rounded-xl border transition-all text-left ${
                        active 
                          ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-xs scale-[1.01]" 
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

            {/* Refer to Base Hospital checkbox & Remarks */}
            <div className="bg-red-50/50 border border-red-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-800 flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4 text-red-600" /> Refer to Base Hospital
                  </p>
                  <p className="text-[10px] text-slate-500 max-w-md">
                    Flag patient for urgent referral to Sankara Eye Hospital for advanced laser/surgical care.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={watch("referToBaseHospital")}
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
            className="flex-1 bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white font-extrabold h-11 text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md"
          >
            <Save className="h-4.5 w-4.5" />
            {isUploading ? "Saving screening record..." : "Complete & Save Patient Screening"}
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
                <CardTitle className="text-base font-bold text-slate-900">Referred Patients (Ophthalmic Officers, VCs & ASHA Workers)</CardTitle>
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
                  const isOphthalmic = item.referrerType === "ophthalmic_officer";
                  return (
                    <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-[#FF6B00] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{item.patientName}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOphthalmic ? "bg-amber-100 text-amber-900 border border-amber-300" : isAsha ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {isOphthalmic ? "Ophthalmic Officer" : isAsha ? "ASHA Worker" : "Vision Center"}
                          </span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                            {item.age} yrs • {item.gender}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 font-medium">
                          📞 {item.phone} {item.address ? `• 📍 ${item.address}` : ""}
                        </p>

                        <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-semibold">
                          <span>Source: <strong className="text-slate-800">{isOphthalmic ? "Ophthalmic Officer" : isAsha ? item.phcName || "ASHA Worker" : item.visionCenterName || item.visionCenterCode}</strong> ({item.referralDate})</span>
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
