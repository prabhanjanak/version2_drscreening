import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, Plus, Search, MapPin, Phone, ExternalLink, 
  List, Map, Edit2, Trash2, X, Send, UserCheck, ShieldCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VisionCenter {
  id: number;
  name: string;
  shortCode: string;
  sankaraUnit: string;
  state: string;
  district: string;
  taluk?: string;
  pincode?: string;
  address?: string;
  phone?: string;
  mapsUrl?: string;
  latitude?: string;
  longitude?: string;
  status: string;
}

interface ScreeningPlace {
  id: number;
  name: string;
  shortCode: string;
  district: string;
  state: string;
  taluk?: string;
  sankaraUnit?: string;
  status: string;
  latitude?: string;
  longitude?: string;
}

const SANKARA_UNITS = [
  "Sankara Eye Hospital Shimoga",
  "Sankara Eye Hospital Coimbatore",
  "Sankara Eye Hospital Bangalore",
  "Sankara Eye Hospital Guntur",
  "Sankara Eye Hospital Krishnankoil",
  "Sankara Eye Hospital Anand",
  "Sankara Eye Hospital Ludhiana",
  "Sankara Eye Hospital Kanpur",
  "Sankara Eye Hospital Jaipur",
  "Sankara Eye Hospital Indore",
  "Sankara Eye Hospital Hyderabad",
  "Sankara Eye Hospital Panvel",
  "Sankara Eye Hospital Varanasi",
  "Sankara Eye Hospital Berhampur",
];

const STATE_DISTRICTS: Record<string, string[]> = {
  "Karnataka": ["Shivamogga", "Chitradurga", "Davanagere", "Chikkamagaluru", "Bengaluru Urban", "Mysuru", "Tumakuru"],
  "Tamil Nadu": ["Coimbatore", "Tiruppur", "Erode", "Salem", "Chennai", "Madurai"],
  "Andhra Pradesh": ["Guntur", "Vijayawada", "Visakhapatnam"],
  "Gujarat": ["Anand", "Ahmedabad", "Vadodara"],
  "Punjab": ["Ludhiana", "Jalandhar"],
  "Uttar Pradesh": ["Kanpur", "Varanasi"],
  "Rajasthan": ["Jaipur"],
  "Madhya Pradesh": ["Indore"],
  "Telangana": ["Hyderabad"],
  "Maharashtra": ["Panvel", "Mumbai"],
  "Odisha": ["Berhampur"]
};

export default function DrsmsVisionCenters() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"list" | "map">("list");
  const [centers, setCenters] = useState<VisionCenter[]>([]);
  const [camps, setCamps] = useState<ScreeningPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<string>("All");

  // Modal State for Add/Edit Vision Center
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<VisionCenter | null>(null);
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [sankaraUnit, setSankaraUnit] = useState(SANKARA_UNITS[0]);
  const [stateStr, setStateStr] = useState("Karnataka");
  const [district, setDistrict] = useState("Shivamogga");
  const [taluk, setTaluk] = useState("");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState("active");

  // Modal State for Refer Patient to Camp (VC User Action)
  const [referModalOpen, setReferModalOpen] = useState(false);
  const [referringVc, setReferringVc] = useState<VisionCenter | null>(null);
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [targetCampCode, setTargetCampCode] = useState("");
  const [drNotes, setDrNotes] = useState("");

  const token = localStorage.getItem("vision2020_token");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vcRes, campsRes] = await Promise.all([
        fetch("/api/vision-centers", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/screening-places", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (vcRes.ok) {
        const vcData = await vcRes.json();
        setCenters(vcData);
      }
      if (campsRes.ok) {
        const campData = await campsRes.json();
        setCamps(campData);
      }
    } catch (err: any) {
      toast({ title: "Error loading vision centers", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Leaflet Dynamic Integration Hook for VC + Camp Map
  useEffect(() => {
    if (activeTab !== "map" || (centers.length === 0 && camps.length === 0)) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const L = (window as any).L;
      if (!L || !document.getElementById("vc-schedule-map")) return;

      const firstWithCoords = centers.find(c => c.latitude && c.longitude) || camps.find(p => p.latitude && p.longitude);
      const centerLat = firstWithCoords ? parseFloat(firstWithCoords.latitude!) : 13.9299;
      const centerLng = firstWithCoords ? parseFloat(firstWithCoords.longitude!) : 75.5681;

      const googleStreet = L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", { attribution: "© Google Maps" });
      const googleSatellite = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", { attribution: "© Google Maps Imagery" });
      const googleTerrain = L.tileLayer("https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}", { attribution: "© Google Maps Terrain" });
      const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" });

      const googleTraffic = L.tileLayer("https://mt1.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}", { attribution: "© Google Traffic", opacity: 0.8 });

      const map = L.map("vc-schedule-map", {
        center: [centerLat, centerLng],
        zoom: 8,
        layers: [googleStreet]
      });

      const baseMaps = {
        "Google Street": googleStreet,
        "Google Satellite": googleSatellite,
        "Google Terrain": googleTerrain,
        "OpenStreetMap": osm,
      };

      const overlayMaps = {
        "Live Traffic Overlay": googleTraffic
      };

      L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

      // Render Vision Center Markers (Blue icons)
      centers.forEach((vc) => {
        if (!vc.latitude || !vc.longitude) return;
        const lat = parseFloat(vc.latitude);
        const lng = parseFloat(vc.longitude);

        const customIcon = L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const popupHTML = `
          <div style="font-family: sans-serif; padding: 4px; min-width: 170px;">
            <span style="background: #2563eb; color: white; border-radius: 4px; padding: 2px 6px; font-size: 9px; font-weight: bold;">Vision Center</span>
            <p style="margin: 4px 0 2px 0; font-weight: 800; font-size: 13px; color: #1e293b;">${vc.name}</p>
            <p style="margin: 0; font-size: 10px; color: #64748b;">${vc.taluk ? vc.taluk + ", " : ""}${vc.district}</p>
            <p style="margin: 4px 0; font-size: 10px; color: #475569; font-weight: bold;">Unit: ${vc.sankaraUnit}</p>
            ${vc.phone ? `<p style="margin: 2px 0; font-size: 10px; color: #3b82f6;">📞 ${vc.phone}</p>` : ""}
          </div>
        `;

        L.marker([lat, lng], { icon: customIcon }).addTo(map).bindPopup(popupHTML);
      });

      // Render Camp Markers (Red/Green icons)
      camps.forEach((p) => {
        if (!p.latitude || !p.longitude) return;
        const lat = parseFloat(p.latitude);
        const lng = parseFloat(p.longitude);

        const color = p.status === "completed" ? "green" : "red";
        const customIcon = L.icon({
          iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const popupHTML = `
          <div style="font-family: sans-serif; padding: 4px; min-width: 160px;">
            <span style="background: #FF6B00; color: white; border-radius: 4px; padding: 2px 6px; font-size: 9px; font-weight: bold;">DR Camp</span>
            <p style="margin: 4px 0 2px 0; font-weight: 800; font-size: 12px; color: #1e293b;">${p.name}</p>
            <p style="margin: 0; font-size: 10px; color: #64748b;">Code: ${p.shortCode}</p>
          </div>
        `;

        L.marker([lat, lng], { icon: customIcon }).addTo(map).bindPopup(popupHTML);
      });
    };

    document.body.appendChild(script);
    return () => {
      link.remove();
      script.remove();
    };
  }, [activeTab, centers, camps]);

  const roleStr = user?.userType as string;
  const isCoordinator = roleStr === "super_admin" || roleStr === "admin" || roleStr === "admin_unit" || roleStr === "unit_head";

  const openCreateModal = () => {
    setEditingCenter(null);
    setName("");
    setShortCode("");
    setSankaraUnit(user?.assignedTrack || SANKARA_UNITS[0]);
    setStateStr("Karnataka");
    setDistrict("Shivamogga");
    setTaluk("");
    setPincode("");
    setAddress("");
    setPhone("");
    setMapsUrl("");
    setLatitude("");
    setLongitude("");
    setStatus("active");
    setModalOpen(true);
  };

  const openEditModal = (vc: VisionCenter) => {
    setEditingCenter(vc);
    setName(vc.name);
    setShortCode(vc.shortCode);
    setSankaraUnit(vc.sankaraUnit);
    setStateStr(vc.state);
    setDistrict(vc.district);
    setTaluk(vc.taluk || "");
    setPincode(vc.pincode || "");
    setAddress(vc.address || "");
    setPhone(vc.phone || "");
    setMapsUrl(vc.mapsUrl || "");
    setLatitude(vc.latitude || "");
    setLongitude(vc.longitude || "");
    setStatus(vc.status);
    setModalOpen(true);
  };

  const handleSaveCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !shortCode || !sankaraUnit || !stateStr || !district) {
      toast({ title: "Validation Error", description: "Please fill in all mandatory fields.", variant: "destructive" });
      return;
    }

    try {
      const url = editingCenter ? `/api/vision-centers/${editingCenter.id}` : "/api/vision-centers";
      const method = editingCenter ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          shortCode,
          sankaraUnit,
          state: stateStr,
          district,
          taluk,
          pincode,
          address,
          phone,
          mapsUrl,
          latitude,
          longitude,
          status,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save vision center");
      }

      toast({ title: "Success", description: `Vision Center ${editingCenter ? "updated" : "created"} successfully.` });
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteCenter = async (id: number) => {
    if (!confirm("Are you sure you want to delete this Vision Center?")) return;
    try {
      const res = await fetch(`/api/vision-centers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete vision center");
      toast({ title: "Deleted", description: "Vision center removed." });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Refer Patient to Camp Modal Opener
  const openReferModal = (vc: VisionCenter) => {
    setReferringVc(vc);
    setPatientName("");
    setAge("");
    setGender("Male");
    setPatientPhone("");
    setPatientAddress("");
    // Find first active camp under this unit or fallback to first overall camp
    const unitCamp = camps.find(c => c.sankaraUnit === vc.sankaraUnit || !c.sankaraUnit);
    const defaultCampCode = unitCamp?.shortCode || camps[0]?.shortCode || "SHIMOGA";
    setTargetCampCode(defaultCampCode);
    setDrNotes("");
    setReferModalOpen(true);
  };

  const handleSendReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCampCode = targetCampCode || camps[0]?.shortCode || "SHIMOGA";
    if (!patientName || !age || !gender || !patientPhone || !effectiveCampCode || !referringVc) {
      toast({ title: "Validation Error", description: "Please complete patient name, age, phone, and target DR camp.", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch("/api/vc-referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientName,
          age: parseInt(String(age), 10),
          gender,
          phone: patientPhone.trim(),
          address: patientAddress || null,
          visionCenterCode: referringVc.shortCode,
          targetCampCode: effectiveCampCode,
          drNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit referral");
      }

      toast({ title: "Referral Submitted!", description: `Patient ${patientName} referred to DR Camp ${effectiveCampCode}.` });
      setReferModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filteredCenters = centers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.taluk && c.taluk.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          c.shortCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUnit = selectedUnit === "All" || c.sankaraUnit === selectedUnit;
    return matchesSearch && matchesUnit;
  });

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-[#FF6B00]" /> Vision Centers Network
          </h1>
          <p className="text-sm text-slate-500">Manage satellite Vision Centers (VCs) and coordinate tele-ophthalmology DR referrals.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="flex bg-white border border-slate-200 p-0.5 rounded-lg text-xs font-semibold shadow-xs">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                activeTab === "list" ? "bg-orange-50 text-[#FF6B00]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="h-3.5 w-3.5" /> VC Directory
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                activeTab === "map" ? "bg-orange-50 text-[#FF6B00]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Map className="h-3.5 w-3.5" /> Interactive Map
            </button>
          </div>

          {isCoordinator && (
            <Button onClick={openCreateModal} className="bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white hover:from-[#FF6B00] hover:to-orange-600 text-xs font-semibold px-4 h-8 rounded-lg shadow-sm ml-auto">
              <Plus className="h-4 w-4 mr-1" /> Add Vision Center
            </Button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      {activeTab === "list" && (
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by VC Name, District, Taluk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Sankara Base Unit:</span>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg p-2 bg-white font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-[#FF6B00]"
            >
              <option value="All">All Base Units (14 Hospitals)</option>
              {SANKARA_UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : activeTab === "map" ? (
        /* MAP VIEW TAB */
        <Card className="rounded-xl border border-slate-200/80 shadow-sm bg-white overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-[11px] font-extrabold text-slate-700 shrink-0">
            <span>Vision Centers (Blue) & DR Camps (Red/Green) Map</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="h-3 w-3 bg-blue-600 rounded-full" /> Vision Center (VC)</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 bg-red-500 rounded-full" /> Active DR Camp</span>
            </div>
          </div>
          <div id="vc-schedule-map" className="w-full flex-1 relative z-10" />
        </Card>
      ) : filteredCenters.length === 0 ? (
        <Card className="rounded-xl border border-slate-200/80 p-8 text-center flex flex-col items-center gap-2 bg-white">
          <Building2 className="h-10 w-10 text-slate-300" />
          <h3 className="font-bold text-slate-700">No Vision Centers Found</h3>
          <p className="text-xs text-slate-400 max-w-sm">No satellite vision centers matched your search query.</p>
        </Card>
      ) : (
        /* LIST VIEW TAB */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCenters.map((vc) => (
            <Card key={vc.id} className="rounded-xl border border-slate-200 shadow-xs bg-white hover:border-[#FF6B00] transition-all flex flex-col justify-between">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-start justify-between">
                <div>
                  <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-extrabold uppercase mb-1">
                    VC Code: {vc.shortCode}
                  </span>
                  <CardTitle className="text-sm font-bold text-slate-900">{vc.name}</CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    {vc.taluk ? `${vc.taluk}, ` : ""}{vc.district}, {vc.state}
                  </CardDescription>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${vc.status === "active" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                  {vc.status}
                </span>
              </CardHeader>

              <CardContent className="p-4 pt-3 text-xs space-y-2 flex-1">
                <p className="text-[10px] text-slate-500 font-semibold">
                  <strong className="text-slate-700">Responsible Base Unit:</strong><br />
                  {vc.sankaraUnit}
                </p>

                {vc.address && (
                  <p className="text-[10px] text-slate-400 line-clamp-2">
                    📍 {vc.address} {vc.pincode ? `- ${vc.pincode}` : ""}
                  </p>
                )}

                {vc.phone && (
                  <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {vc.phone}
                  </p>
                )}
              </CardContent>

              <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => openReferModal(vc)}
                  className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white rounded-lg text-[10px] font-bold shadow-xs hover:from-[#FF6B00] hover:to-orange-600 flex items-center gap-1"
                >
                  <Send className="h-3 w-3" /> Refer Patient to Camp
                </button>

                <div className="flex items-center gap-1">
                  {vc.mapsUrl && (
                    <a
                      href={vc.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50"
                      title="Open Google Maps"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                    </a>
                  )}
                  {isCoordinator && (
                    <>
                      <button
                        onClick={() => openEditModal(vc)}
                        className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCenter(vc.id)}
                        className="p-1.5 bg-white border border-slate-200 rounded-md text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit VC Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <CardHeader className="flex flex-row justify-between items-center py-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold">{editingCenter ? "Edit" : "Create"} Vision Center</CardTitle>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <form onSubmit={handleSaveCenter}>
              <CardContent className="p-4 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Vision Center Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chitradurga Vision Center"
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Short Code (3-6 Chars) *</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingCenter}
                      maxLength={8}
                      value={shortCode}
                      onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                      placeholder="e.g. VC_CHITRA"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Responsible Sankara Base Unit *</label>
                  <select
                    value={sankaraUnit}
                    onChange={(e) => setSankaraUnit(e.target.value)}
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#FF6B00]"
                  >
                    {SANKARA_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">State *</label>
                    <select
                      value={stateStr}
                      onChange={(e) => {
                        const newSt = e.target.value;
                        setStateStr(newSt);
                        const dists = STATE_DISTRICTS[newSt] || ["Shivamogga"];
                        setDistrict(dists[0]);
                      }}
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white"
                    >
                      {Object.keys(STATE_DISTRICTS).map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">District *</label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white"
                    >
                      {(STATE_DISTRICTS[stateStr] || [district]).map(dt => (
                        <option key={dt} value={dt}>{dt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Taluk / Town</label>
                    <input
                      type="text"
                      value={taluk}
                      onChange={(e) => setTaluk(e.target.value)}
                      placeholder="e.g. Chitradurga"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 08194-223344"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Google Maps Link / Coordinates</label>
                  <input
                    type="text"
                    value={mapsUrl}
                    onChange={(e) => setMapsUrl(e.target.value)}
                    placeholder="Paste Google Maps URL or Plus Code (e.g. https://maps.google.com/?q=14.2251,76.3980)"
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Coordinates (Latitude & Longitude) will be auto-parsed from the maps link on save.</p>
                </div>
              </CardContent>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="text-xs h-8">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#FF6B00] hover:bg-orange-600 text-white text-xs h-8">
                  {editingCenter ? "Update Vision Center" : "Create Vision Center"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Refer Patient Modal */}
      {referModalOpen && referringVc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <CardHeader className="flex flex-row justify-between items-center py-4 border-b border-slate-100 bg-orange-50/50">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Refer VC Patient to DR Camp</CardTitle>
                <CardDescription className="text-[10px]">Source VC: {referringVc.name} ({referringVc.sankaraUnit})</CardDescription>
              </div>
              <button onClick={() => setReferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <form onSubmit={handleSendReferral}>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Patient Full Name *</label>
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
                    <label className="block font-semibold text-slate-600 mb-1">Age *</label>
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
                    <label className="block font-semibold text-slate-600 mb-1">Gender *</label>
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
                  <label className="block font-semibold text-slate-600 mb-1">Contact Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="10 digit mobile number"
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Target Outreach DR Camp *</label>
                  <select
                    required
                    value={targetCampCode}
                    onChange={(e) => setTargetCampCode(e.target.value)}
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white font-bold text-slate-700"
                  >
                    {camps.map(c => (
                      <option key={c.shortCode} value={c.shortCode}>
                        {c.name} ({c.shortCode}) - {c.district}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Tele-Ophthalmology Clinical Notes</label>
                  <textarea
                    rows={2}
                    value={drNotes}
                    onChange={(e) => setDrNotes(e.target.value)}
                    placeholder="e.g. Suspected Moderate NPDR found during tele-consultation. Referred for fundus screening."
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>
              </CardContent>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setReferModalOpen(false)} className="text-xs h-8">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#FF6B00] hover:bg-orange-600 text-white text-xs h-8">
                  Submit VC Referral
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
