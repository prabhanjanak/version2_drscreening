import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Heart, User, Phone, MapPin, Calendar, Plus, 
  Search, CheckCircle, Clock, AlertTriangle, RefreshCw, X, ShieldAlert, Activity, FileText 
} from "lucide-react";

interface AshaReferral {
  id: number;
  patientName: string;
  age: number;
  gender: string;
  phone: string;
  address: string | null;
  phcName: string | null;
  randomBloodSugar: string | null;
  symptoms: string | null;
  targetCampCode: string;
  targetCampName?: string | null;
  referralDate: string;
  drNotes: string | null;
  status: string;
  createdAt: string;
}

export default function DrsmsAshaReferrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<AshaReferral[]>([]);
  const [camps, setCamps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [activeTab, setActiveTab] = useState<"refer" | "list">("refer");

  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Female");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [phcName, setPhcName] = useState("");
  const [randomBloodSugar, setRandomBloodSugar] = useState("");
  const [symptoms, setSymptoms] = useState("Blurred vision");
  const [targetCampCode, setTargetCampCode] = useState("");
  const [drNotes, setDrNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem("vision2020_token");
      // 1. Fetch active camps
      const campsRes = await fetch("/api/screening-places", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      let activeCamps: any[] = [];
      if (campsRes.ok) {
        activeCamps = await campsRes.json();
        setCamps(activeCamps);
        if (activeCamps.length > 0 && !targetCampCode) {
          setTargetCampCode(activeCamps[0].shortCode);
        }
      }

      // 2. Fetch referrals
      const refRes = await fetch("/api/vc-referrals", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (refRes.ok) {
        const data = await refRes.json();
        setReferrals(data);
      }
    } catch (err: any) {
      toast({ title: "Error loading data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setPatientName("");
    setAge("");
    setGender("Female");
    setPhone("");
    setAddress("");
    setPhcName("");
    setRandomBloodSugar("");
    setSymptoms("Blurred vision");
    setDrNotes("");
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !age.trim() || !targetCampCode) {
      toast({ title: "Validation Error", description: "Please enter patient name, age, and select target DR camp.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const authToken = localStorage.getItem("vision2020_token");
      const userRole = (user as any)?.userType || "ophthalmic_officer";
      const referrerType = userRole === "asha_worker" ? "asha_worker" : userRole === "ophthalmic_officer" ? "ophthalmic_officer" : "vision_center";

      const res = await fetch("/api/vc-referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          patientName: patientName.trim(),
          age: parseInt(age, 10),
          gender,
          phone: phone.trim() || "N/A",
          address: address.trim() || "Local Area",
          village: address.trim() || "Local Area",
          referrerType,
          phcName: phcName.trim() || null,
          randomBloodSugar: randomBloodSugar.trim() || null,
          symptoms: symptoms.trim() || null,
          targetCampCode,
          drNotes: drNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit patient referral");
      }

      toast({ 
        title: "Patient Referral Submitted! 📋", 
        description: `Patient ${patientName} referred to camp (${targetCampCode}) successfully.` 
      });
      resetForm();
      await fetchData();
      setActiveTab("list");
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReferrals = referrals.filter((r) => {
    const matchesSearch = 
      r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery) ||
      (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.phcName && r.phcName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.targetCampCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = referrals.filter(r => r.status === "pending").length;
  const screenedCount = referrals.filter(r => r.status === "completed" || r.status === "screened").length;

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Heart className="h-6 w-6 text-[#FF6B00]" /> Ophthalmic Officer & Camp Referral Portal
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Refer field patients to upcoming Diabetic Retinopathy screening camps and track their evaluation status.
          </p>
        </div>

        {/* 2 TABS NAVIGATION */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl shadow-inner text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("refer")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeTab === "refer"
                ? "bg-white text-[#FF6B00] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Plus className="h-4 w-4" /> 1. Refer a Patient
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              activeTab === "list"
                ? "bg-white text-[#FF6B00] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="h-4 w-4" /> 2. My Referrals ({referrals.length})
          </button>
        </div>
      </div>

      {/* TAB 1: REFER A PATIENT FORM */}
      {activeTab === "refer" && (
        <Card className="max-w-3xl mx-auto rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white p-5">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Heart className="h-5 w-5" /> Patient Camp Referral Form
            </CardTitle>
            <CardDescription className="text-xs text-orange-100">
              Collect patient screening details to refer them directly to an active Diabetic Retinopathy camp.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmitReferral} className="space-y-4">
              {/* Patient Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Test Patient Gangamma"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#FF6B00] outline-none"
                />
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. Age (Years) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    placeholder="e.g. 58"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. Gender *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#FF6B00] outline-none bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Village & Mobile Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    4. Village / Town / District (Select or Type) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Konandur, Thirthahalli"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9845012345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
              </div>

              {/* Target DR Screening Camp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  5. Target DR Screening Camp (Select Camp) *
                </label>
                <select
                  required
                  value={targetCampCode}
                  onChange={(e) => setTargetCampCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#FF6B00] outline-none bg-white text-slate-800"
                >
                  {camps.length === 0 ? (
                    <option value="">Loading Active Camps...</option>
                  ) : (
                    camps.map((c) => (
                      <option key={c.shortCode} value={c.shortCode}>
                        🏥 {c.name || c.placeName || c.shortCode} ({c.shortCode}) — {c.taluk || c.district || "Camp"}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Primary Health Center & RBS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PHC / Sub-Center Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Konandur PHC"
                    value={phcName}
                    onChange={(e) => setPhcName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Random Blood Sugar (mg/dL) (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 185 mg/dL"
                    value={randomBloodSugar}
                    onChange={(e) => setRandomBloodSugar(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
              </div>

              {/* Symptoms & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reported Symptoms
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Blurred vision, difficulty reading"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Clinical / Referral Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Suspected diabetic retinopathy"
                    value={drNotes}
                    onChange={(e) => setDrNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="text-xs font-bold rounded-xl"
                >
                  Clear Form
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#FF6B00] hover:bg-orange-600 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-sm flex items-center gap-2"
                >
                  {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
                  Submit Patient Referral
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: MY REFERRALS LIST */}
      {activeTab === "list" && (
        <div className="space-y-6">
          {/* Analytics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-xl border border-slate-200 shadow-xs bg-white p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Total Referred Patients</p>
                <p className="text-2xl font-black text-slate-800">{referrals.length}</p>
              </div>
              <div className="h-10 w-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF6B00]">
                <Heart className="h-5 w-5" />
              </div>
            </Card>

            <Card className="rounded-xl border border-slate-200 shadow-xs bg-white p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-amber-500">Pending Camp Screening</p>
                <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
              </div>
              <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </Card>

            <Card className="rounded-xl border border-slate-200 shadow-xs bg-white p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-emerald-500">Screened at Camp</p>
                <p className="text-2xl font-black text-emerald-600">{screenedCount}</p>
              </div>
              <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <CheckCircle className="h-5 w-5" />
              </div>
            </Card>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Patient Name, Phone, Village, Camp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold text-slate-600">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1 rounded-md transition-colors ${statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : ""}`}
                >
                  All ({referrals.length})
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={`px-3 py-1 rounded-md transition-colors ${statusFilter === "pending" ? "bg-white text-amber-600 shadow-xs" : ""}`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setStatusFilter("completed")}
                  className={`px-3 py-1 rounded-md transition-colors ${statusFilter === "completed" ? "bg-white text-emerald-600 shadow-xs" : ""}`}
                >
                  Screened ({screenedCount})
                </button>
              </div>

              <Button onClick={fetchData} variant="outline" className="h-8 text-xs font-semibold">
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </div>

          {/* Directory Grid */}
          {loading ? (
            <div className="py-12 flex justify-center text-xs text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading referral records...
            </div>
          ) : filteredReferrals.length === 0 ? (
            <Card className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <Heart className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700">No Patient Referrals Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Use Tab 1: "Refer a Patient" to refer patients from field visits or PHCs.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReferrals.map((r) => {
                const isCompleted = r.status === "completed" || r.status === "screened";
                return (
                  <Card key={r.id} className="rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all bg-white overflow-hidden flex flex-col justify-between">
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-orange-50 text-[#FF6B00] border border-orange-200">
                            Referred to Camp {r.targetCampCode}
                          </span>
                          <h3 className="font-extrabold text-slate-900 text-sm mt-1">{r.patientName}</h3>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {isCompleted ? "Screened at Camp" : "Pending Screening"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Age / Gender</p>
                          <p className="font-bold text-slate-800">{r.age} Yrs • {r.gender}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Phone</p>
                          <p className="font-bold text-slate-800 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" /> {r.phone}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-slate-500">
                        {r.phcName && (
                          <p className="flex items-center gap-1 font-semibold text-slate-700">
                            <MapPin className="h-3.5 w-3.5 text-[#FF6B00]" /> PHC: {r.phcName}
                          </p>
                        )}
                        {r.address && (
                          <p className="text-slate-500 pl-4 text-[11px] truncate">Village: {r.address}</p>
                        )}
                        {r.randomBloodSugar && (
                          <p className="flex items-center gap-1 text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                            <Activity className="h-3 w-3" /> RBS: {r.randomBloodSugar} mg/dL
                          </p>
                        )}
                        {r.symptoms && (
                          <p className="text-[11px] text-slate-600 italic">Symptoms: {r.symptoms}</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold">
                      <span>Target Camp: <strong className="text-slate-700">{r.targetCampCode}</strong></span>
                      <span>{r.referralDate}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
