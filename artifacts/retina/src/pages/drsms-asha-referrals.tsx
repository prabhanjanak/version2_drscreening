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

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [phcName, setPhcName] = useState("");
  const [randomBloodSugar, setRandomBloodSugar] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [targetCampCode, setTargetCampCode] = useState("");
  const [drNotes, setDrNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("vision2020_token");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active camps
      const campsRes = await fetch("/api/screening-places", {
        headers: { Authorization: `Bearer ${token}` }
      });
      let activeCamps: any[] = [];
      if (campsRes.ok) {
        activeCamps = await campsRes.json();
        setCamps(activeCamps);
      }

      // 2. Fetch ASHA referrals
      const refRes = await fetch("/api/vc-referrals?referrerType=asha_worker", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (refRes.ok) {
        const data = await refRes.json();
        setReferrals(data);
      }
    } catch (err: any) {
      toast({ title: "Error loading referrals", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setPatientName("");
    setAge("45");
    setGender("Male");
    setPhone("");
    setAddress("");
    setPhcName((user as any)?.assignedPlace || "Primary Health Center");
    setRandomBloodSugar("");
    setSymptoms("Blurred vision");
    setTargetCampCode(camps[0]?.shortCode || "SHIMOGA");
    setDrNotes("");
    setModalOpen(true);
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !age || !phone || !targetCampCode) {
      toast({ title: "Validation Error", description: "Please complete patient name, age, phone, and target DR camp.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/vc-referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientName,
          age: parseInt(age, 10),
          gender,
          phone: phone.trim(),
          address: address || null,
          referrerType: "asha_worker",
          phcName: phcName || null,
          randomBloodSugar: randomBloodSugar || null,
          symptoms: symptoms || null,
          targetCampCode,
          drNotes: drNotes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit ASHA referral");
      }

      toast({ 
        title: "Patient Referral Registered! 📋", 
        description: `Patient ${patientName} referred to DR Camp ${targetCampCode} successfully.` 
      });
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReferrals = referrals.filter((r) => {
    const matchesSearch = 
      r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery) ||
      (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.phcName && r.phcName.toLowerCase().includes(searchQuery.toLowerCase()));
    
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
            <Heart className="h-6 w-6 text-[#FF6B00]" /> ASHA Patient Screening Portal
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Collect door-to-door DR screening metrics & refer high-risk diabetic patients to DR camps.
          </p>
        </div>

        <Button 
          onClick={openCreateModal} 
          className="bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> New Patient Referral
        </Button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Referrals</p>
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
            placeholder="Search Patient Name, Phone, Village, PHC..."
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
              All
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
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading ASHA referrals...
        </div>
      ) : filteredReferrals.length === 0 ? (
        <Card className="p-8 text-center bg-white rounded-xl border border-slate-200">
          <Heart className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700">No Patient Referrals Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Click "New Patient Referral" above to collect door-to-door screening data.
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
                      <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                        ASHA Referral
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

      {/* Create Referral Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white p-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                  <Heart className="h-5 w-5" /> ASHA Patient Referral Form
                </CardTitle>
                <CardDescription className="text-xs text-orange-100">
                  Collect patient screening data & schedule camp evaluation.
                </CardDescription>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <form onSubmit={handleSubmitReferral}>
              <CardContent className="p-4 md:p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient full name"
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Age (Years) *</label>
                    <input
                      type="number"
                      required
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 52"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gender *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10 digit contact number"
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Village / Address *</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Village or street name"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">PHC / Sub-Center Name</label>
                    <input
                      type="text"
                      value={phcName}
                      onChange={(e) => setPhcName(e.target.value)}
                      placeholder="e.g. Shimoga Rural PHC"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Random Blood Sugar (mg/dL)</label>
                    <input
                      type="text"
                      value={randomBloodSugar}
                      onChange={(e) => setRandomBloodSugar(e.target.value)}
                      placeholder="e.g. 180"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reported Eye Symptoms</label>
                    <input
                      type="text"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="e.g. Blurred vision, floaters"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target DR Screening Camp *</label>
                  <select
                    required
                    value={targetCampCode}
                    onChange={(e) => setTargetCampCode(e.target.value)}
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white font-bold text-slate-800"
                  >
                    {camps.map(c => (
                      <option key={c.shortCode} value={c.shortCode}>
                        {c.name} ({c.shortCode}) - {c.district}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Additional Field / Clinical Notes</label>
                  <textarea
                    rows={2}
                    value={drNotes}
                    onChange={(e) => setDrNotes(e.target.value)}
                    placeholder="e.g. Patient has 5 year history of diabetes. Needs fundus evaluation."
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
              </CardContent>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="text-xs h-8">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-[#FF6B00] hover:bg-orange-600 text-white text-xs h-8 font-bold"
                >
                  {submitting ? "Registering..." : "Submit ASHA Referral"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
