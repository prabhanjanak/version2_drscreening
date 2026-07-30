import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  PhoneCall, Search, Filter, Calendar, MapPin, 
  User, CheckCircle2, Clock, XCircle, ChevronRight, 
  Building2, Heart, Plus, ArrowRight, FileText, AlertCircle, Phone
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VcReferral {
  id: number;
  patientName: string;
  age: number;
  gender: string;
  phone: string;
  address?: string | null;
  visionCenterCode: string;
  visionCenterName?: string | null;
  referrerType: string;
  phcName?: string | null;
  randomBloodSugar?: string | null;
  symptoms?: string | null;
  targetCampCode: string;
  targetCampName?: string | null;
  referralDate: string;
  drNotes?: string | null;
  status: string; // pending | follow_up_required | rescheduled | completed | unreachable
  createdAt: string;
}

interface ScreeningPlace {
  id: number;
  shortCode: string;
  name: string;
  status: string;
}

export default function DrsmsFollowUp() {
  const { user } = useAuth();
  const token = localStorage.getItem("vision2020_token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [referrals, setReferrals] = useState<VcReferral[]>([]);
  const [camps, setCamps] = useState<ScreeningPlace[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCampCode, setSelectedCampCode] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("follow_up_required"); // default show follow up required
  const [searchQuery, setSearchQuery] = useState("");

  // Action Modal state
  const [selectedReferral, setSelectedReferral] = useState<VcReferral | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [newTargetCamp, setNewTargetCamp] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchCamps();
    fetchReferrals();
  }, []);

  const fetchCamps = async () => {
    try {
      const authToken = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/screening-places", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCamps(data);
      }
    } catch (err) {
      console.error("Failed to fetch camps", err);
    }
  };

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/vc-referrals", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReferrals(data);
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to load follow-up referrals list", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenActionModal = (item: VcReferral) => {
    setSelectedReferral(item);
    setNewTargetCamp(item.targetCampCode);
    setFollowUpNotes(item.drNotes || "");
    setActionModalOpen(true);
  };

  const handleUpdateReferralStatus = async (newStatus: string) => {
    if (!selectedReferral) return;
    setUpdating(true);
    try {
      const authToken = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/vc-referrals/${selectedReferral.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          status: newStatus,
          targetCampCode: newTargetCamp,
          drNotes: followUpNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned status ${res.status}`);
      }

      toast({
        title: "Follow-Up Record Updated 📋",
        description: `Updated status for ${selectedReferral.patientName} to '${newStatus.replace(/_/g, " ")}'.`,
      });
      setActionModalOpen(false);
      fetchReferrals();
    } catch (err: any) {
      toast({ title: "Update Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  // Filter logic
  const filteredReferrals = referrals.filter((item) => {
    // Camp filter
    if (selectedCampCode !== "ALL" && item.targetCampCode !== selectedCampCode) {
      return false;
    }

    // Status filter
    if (statusFilter !== "ALL") {
      if (statusFilter === "follow_up_required") {
        if (item.status !== "follow_up_required" && item.status !== "pending") return false;
      } else if (item.status !== statusFilter) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.patientName.toLowerCase().includes(q);
      const matchPhone = item.phone.includes(q);
      const matchAddress = (item.address || "").toLowerCase().includes(q);
      const matchPhc = (item.phcName || "").toLowerCase().includes(q);
      const matchVc = (item.visionCenterName || item.visionCenterCode || "").toLowerCase().includes(q);
      return matchName || matchPhone || matchAddress || matchPhc || matchVc;
    }

    return true;
  });

  // Summary counts
  const totalFollowUps = referrals.filter((r) => r.status === "follow_up_required" || r.status === "pending").length;
  const rescheduledCount = referrals.filter((r) => r.status === "rescheduled").length;
  const completedCount = referrals.filter((r) => r.status === "completed").length;

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <PhoneCall className="h-6 w-6 text-[#FF6B00]" /> Patient Follow-Up Queue
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Track and re-engage referred patients who missed their screening camp date or need transport support.
          </p>
        </div>

        <Button
          onClick={() => setLocation("/asha-referrals")}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4 text-[#FF6B00]" /> New Patient Referral
        </Button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-amber-500">Pending Follow-Ups (No-Shows)</p>
            <p className="text-2xl font-black text-amber-600">{totalFollowUps}</p>
          </div>
          <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        </Card>

        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-blue-500">Rescheduled for Next Camp</p>
            <p className="text-2xl font-black text-blue-600">{rescheduledCount}</p>
          </div>
          <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Calendar className="h-5 w-5" />
          </div>
        </Card>

        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-emerald-500">Converted & Screened</p>
            <p className="text-2xl font-black text-emerald-600">{completedCount}</p>
          </div>
          <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filters Bar: Camp Selector, Status Pills & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Camp Selection Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedCampCode}
              onChange={(e) => setSelectedCampCode(e.target.value)}
              className="w-full md:w-64 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg p-2 focus:outline-none focus:border-[#FF6B00]"
            >
              <option value="ALL">All Screening Camps</option>
              {camps.map((c) => (
                <option key={c.id} value={c.shortCode}>
                  {c.name} ({c.shortCode})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, phone, village..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#FF6B00]"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
          <button
            onClick={() => setStatusFilter("follow_up_required")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === "follow_up_required"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Pending Follow-Up (No-Shows) ({totalFollowUps})
          </button>

          <button
            onClick={() => setStatusFilter("rescheduled")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === "rescheduled"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Rescheduled ({rescheduledCount})
          </button>

          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === "completed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Completed & Screened ({completedCount})
          </button>

          <button
            onClick={() => setStatusFilter("unreachable")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === "unreachable"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Unreachable / Lost
          </button>

          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Referrals ({referrals.length})
          </button>
        </div>

      </div>

      {/* Patients List Grid */}
      <Card className="rounded-xl border border-slate-200 shadow-xs bg-white overflow-hidden">
        <CardHeader className="py-4 border-b border-slate-100 bg-slate-50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Follow-Up Patient Directory</CardTitle>
            <CardDescription className="text-xs">
              Showing {filteredReferrals.length} patient records
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading follow-up queue...</div>
          ) : filteredReferrals.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Clock className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">No follow-up records found matching filters.</p>
              <p className="text-[11px] text-slate-400">Try changing camp selection or status filters above.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReferrals.map((item) => {
                const isAsha = item.referrerType === "asha_worker";
                const isNoShow = item.status === "follow_up_required" || item.status === "pending";
                const isRescheduled = item.status === "rescheduled";
                const isCompleted = item.status === "completed";
                const isUnreachable = item.status === "unreachable";

                return (
                  <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-base text-slate-900">{item.patientName}</span>
                        <span className="text-xs bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-700">
                          {item.age} yrs • {item.gender}
                        </span>

                        {/* Status Badge */}
                        {isNoShow && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> No-Show / Follow-Up Needed
                          </span>
                        )}
                        {isRescheduled && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Rescheduled for {item.targetCampCode}
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Screened & Completed
                          </span>
                        )}
                        {isUnreachable && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Unreachable / Lost
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                        <span className="flex items-center gap-1 text-slate-900 font-bold">
                          <Phone className="h-3.5 w-3.5 text-[#FF6B00]" /> {item.phone}
                        </span>
                        {item.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" /> {item.address}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          Source: <strong className="text-slate-800">{isAsha ? item.phcName || "ASHA Worker" : item.visionCenterName || item.visionCenterCode}</strong>
                        </span>
                        <span>Target Camp: <strong className="text-slate-900">{item.targetCampName || item.targetCampCode}</strong></span>
                      </div>

                      {item.drNotes && (
                        <div className="text-xs text-slate-700 bg-amber-50/80 border border-amber-200 p-2 rounded-lg font-mono mt-1">
                          <strong>Follow-Up Notes:</strong> {item.drNotes}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
                      
                      <Button
                        onClick={() => handleOpenActionModal(item)}
                        className="bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white text-xs font-bold h-9 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5"
                      >
                        <PhoneCall className="h-4 w-4" /> Follow-Up Action
                      </Button>

                      {isNoShow && (
                        <Button
                          onClick={() => setLocation(`/patients/new?refId=${item.id}&name=${encodeURIComponent(item.patientName)}&age=${item.age}&gender=${item.gender}&phone=${encodeURIComponent(item.phone)}&address=${encodeURIComponent(item.address || "")}`)}
                          variant="outline"
                          className="border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-bold h-9 px-3 rounded-xl flex items-center gap-1"
                        >
                          <FileText className="h-4 w-4 text-[#FF6B00]" /> Screen Now
                        </Button>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Follow-Up Action Modal */}
      {actionModalOpen && selectedReferral && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <CardHeader className="py-4 border-b border-slate-100 bg-orange-50/60">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-[#FF6B00]" /> Follow-Up Action: {selectedReferral.patientName}
              </CardTitle>
              <CardDescription className="text-xs">
                Phone: <strong>{selectedReferral.phone}</strong> &bull; Village: {selectedReferral.address || "Shimoga"}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              
              {/* Target Camp Selector */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase">Re-Schedule for DR Camp *</label>
                <select
                  value={newTargetCamp}
                  onChange={(e) => setNewTargetCamp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#FF6B00]"
                >
                  {camps.map((c) => (
                    <option key={c.id} value={c.shortCode}>
                      {c.name} ({c.shortCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Follow up call notes */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase">Call Record / Follow-Up Notes</label>
                <textarea
                  rows={3}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Record call outcome (e.g., Called patient, promised to attend Saturday camp, shuttle required)..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              {/* Action Choices */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-black text-slate-400 uppercase text-[10px]">Select Follow-Up Outcome Action</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  
                  <Button
                    disabled={updating}
                    onClick={() => handleUpdateReferralStatus("rescheduled")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="h-4 w-4" /> Reschedule Next Camp
                  </Button>

                  <Button
                    disabled={updating}
                    onClick={() => handleUpdateReferralStatus("completed")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark Attended / Screened
                  </Button>

                  <Button
                    disabled={updating}
                    onClick={() => handleUpdateReferralStatus("follow_up_required")}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Clock className="h-4 w-4" /> Keep Pending Call
                  </Button>

                  <Button
                    disabled={updating}
                    onClick={() => handleUpdateReferralStatus("unreachable")}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="h-4 w-4" /> Mark Unreachable
                  </Button>

                </div>
              </div>

            </CardContent>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setActionModalOpen(false)} variant="outline" className="text-xs h-8 rounded-lg">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
