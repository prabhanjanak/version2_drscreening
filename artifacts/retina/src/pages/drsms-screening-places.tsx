import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Edit2, Trash2, RefreshCw, Plus, X, ShieldAlert, CheckCircle, Map, List, Globe, Navigation
} from "lucide-react";

interface ScreeningPlace {
  id: number;
  name: string;
  shortCode: string;
  district: string;
  state: string;
  status: string;
  latitude?: string;
  longitude?: string;
  taluk?: string;
  pincode?: string;
  campDate?: string;
  mapLink?: string;
  sankaraUnit?: string;
}

const SANKARA_UNITS = [
  "Sankara Eye Hospital, Shimoga (Shivamogga)",
  "Sankara Eye Hospital, Bengaluru (Marathahalli)",
  "Sankara Eye Hospital, Coimbatore (RS Puram)",
  "Sankara Eye Hospital, Coimbatore (Sathy Road)",
  "Sankara Eye Hospital, Guntur",
  "Sankara Eye Hospital, Anand",
  "Sankara Eye Hospital, Kanpur",
  "Sankara Eye Hospital, Ludhiana",
  "Sankara Eye Hospital, Jaipur",
  "Sankara Eye Hospital, Indore",
  "Sankara Eye Hospital, Hyderabad",
  "Sankara Eye Hospital, Panvel"
];

// Cascading regional drop-down metadata dictionary
const LOCATION_DATA: Record<string, Record<string, Record<string, string[]>>> = {
  "Karnataka": {
    "Bengaluru Urban": {
      "Bengaluru North": ["560001", "560003", "560096"],
      "Bengaluru South": ["560004", "560011", "560070"],
      "Bengaluru East": ["560008", "560016", "560037"],
      "Anekal": ["562106", "560100", "562107"]
    },
    "Bengaluru Rural": {
      "Devanahalli": ["562110"],
      "Doddaballapura": ["561203"],
      "Hoskote": ["562114"],
      "Nelamangala": ["562123"]
    },
    "Shimoga (Shivamogga)": {
      "Shimoga": ["577201", "577204"],
      "Sagar": ["577401", "577405"],
      "Soraba": ["577429", "577431"],
      "Shikaripura": ["577427", "577428"],
      "Bhadravathi": ["577301", "577302"],
      "Hosanagara": ["577418"],
      "Thirthahalli": ["577432"]
    },
    "Mysore (Mysuru)": {
      "Mysuru": ["570001", "570010"],
      "Hunsur": ["571105"],
      "K.R. Nagar": ["571602"],
      "Nanjangud": ["571301"],
      "H.D. Kote": ["571114"],
      "T. Narasipura": ["571124"],
      "Periyapatna": ["571107"],
      "Saragur": ["571121"]
    },
    "Belgaum (Belagavi)": {
      "Belagavi": ["590001"],
      "Athani": ["591304"],
      "Chikkodi": ["591201"],
      "Gokak": ["591307"],
      "Hukkeri": ["591309"],
      "Rayabag": ["591317"],
      "Ramdurg": ["591123"],
      "Bailhongal": ["591102"],
      "Khanapur": ["591120"]
    },
    "Dharwad": {
      "Dharwad": ["580001"],
      "Hubballi": ["580020", "580030"],
      "Kalghatgi": ["581204"],
      "Kundgol": ["581113"],
      "Navalagund": ["582208"]
    },
    "Dakshina Kannada": {
      "Mangaluru": ["575001", "575003"],
      "Bantwal": ["574211"],
      "Puttur": ["574201"],
      "Sulya": ["574239"],
      "Belthangady": ["574214"],
      "Moodabidri": ["574227"]
    },
    "Udupi": {
      "Udupi": ["576101"],
      "Kundapura": ["576201"],
      "Karkala": ["574104"],
      "Byndoor": ["576214"],
      "Kaup": ["574106"]
    },
    "Davangere": {
      "Davangere": ["577001", "577002"],
      "Harihar": ["577601"],
      "Channagiri": ["577213"],
      "Honnali": ["577217"],
      "Jagalur": ["577528"]
    },
    "Tumkur (Tumakuru)": {
      "Tumakuru": ["572101"],
      "Sira": ["572137"],
      "Tiptur": ["572201"],
      "Gubbi": ["572216"],
      "Kunigal": ["572130"],
      "Madhugiri": ["572132"],
      "Pavagada": ["561202"],
      "Koratagere": ["572129"]
    },
    "Chikmagalur": {
      "Chikkamagaluru": ["577101"],
      "Kadur": ["577548"],
      "Tarikere": ["577228"],
      "Koppa": ["577126"],
      "Mudigere": ["577132"],
      "Sringeri": ["577139"]
    },
    "Hassan": {
      "Hassan": ["573201"],
      "Arsikere": ["573103"],
      "Channarayapatna": ["573116"],
      "Holenarasipura": ["573211"],
      "Sakleshpura": ["573134"],
      "Belur": ["573115"]
    },
    "Bagalkot": {
      "Bagalkot": ["587101"],
      "Badami": ["587201"],
      "Jamkhandi": ["587301"],
      "Mudhol": ["587313"]
    },
    "Vijayapura": {
      "Vijayapura": ["586101"],
      "Indi": ["586209"],
      "Sindagi": ["586128"]
    },
    "Bidar": {
      "Bidar": ["585401"],
      "Bhalki": ["585328"],
      "Humnabad": ["585330"],
      "Basavakalyan": ["585327"]
    },
    "Chamarajanagar": {
      "Chamarajanagar": ["571313"],
      "Kollegal": ["571440"],
      "Gundlupet": ["571111"]
    },
    "Chitradurga": {
      "Chitradurga": ["577501"],
      "Challakere": ["577522"],
      "Hiriyur": ["577546"],
      "Hosadurga": ["577527"]
    },
    "Gadag": {
      "Gadag": ["582101"],
      "Ron": ["582209"],
      "Shirahatti": ["582120"]
    },
    "Haveri": {
      "Haveri": ["581110"],
      "Ranebennur": ["581115"],
      "Byadgi": ["581106"],
      "Shiggaon": ["581205"]
    },
    "Kolar": {
      "Kolar": ["563101"],
      "Bangarapet": ["563114"],
      "Malur": ["563130"]
    },
    "Koppal": {
      "Koppal": ["583231"],
      "Gangavathi": ["583227"],
      "Kushtagi": ["583277"]
    },
    "Mandya": {
      "Mandya": ["571401"],
      "Maddur": ["571428"],
      "Malavalli": ["571430"],
      "Srirangapatna": ["571438"]
    },
    "Raichur": {
      "Raichur": ["584101"],
      "Sindhanur": ["584128"],
      "Manvi": ["584123"]
    },
    "Ramanagara": {
      "Ramanagara": ["562159"],
      "Channapatna": ["562160"],
      "Kanakapura": ["562117"]
    },
    "Uttara Kannada": {
      "Karwar": ["581301"],
      "Sirsi": ["581401"],
      "Bhatkal": ["581320"],
      "Kumta": ["581343"],
      "Honnavar": ["581334"]
    },
    "Yadgir": {
      "Yadgir": ["585201"],
      "Shahapur": ["585223"],
      "Shorapur": ["585220"]
    }
  },
  "Tamil Nadu": {
    "Coimbatore": {
      "Pollachi": ["642001", "642002", "642003"],
      "Mettupalayam": ["641301", "641305"],
      "Coimbatore North": ["641035", "641042", "641046"]
    },
    "Salem": {
      "Salem South": ["636001", "636002"],
      "Salem North": ["636003", "636005"]
    }
  }
};

export default function DrsmsScreeningPlaces() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [places, setPlaces] = useState<ScreeningPlace[]>([]);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "map">("list");
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<ScreeningPlace | null>(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [stateStr, setStateStr] = useState("Karnataka");
  const [district, setDistrict] = useState("Shimoga (Shivamogga)");
  const [taluk, setTaluk] = useState("Shimoga");
  const [pincode, setPincode] = useState("577201");
  const [campDate, setCampDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("active");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [sankaraUnit, setSankaraUnit] = useState("Sankara Eye Hospital, Shimoga (Shivamogga)");
  
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Cascading lists helper
  const stateOptions = Object.keys(LOCATION_DATA);
  const districtOptions = LOCATION_DATA[stateStr] ? Object.keys(LOCATION_DATA[stateStr]) : [];
  const talukOptions = LOCATION_DATA[stateStr]?.[district] ? Object.keys(LOCATION_DATA[stateStr][district]) : [];
  const pincodeOptions = LOCATION_DATA[stateStr]?.[district]?.[taluk] || [];

  // Update cascading values on parent selection changes
  useEffect(() => {
    if (districtOptions.length > 0 && !districtOptions.includes(district)) {
      setDistrict(districtOptions[0]);
    }
  }, [stateStr]);

  useEffect(() => {
    if (talukOptions.length > 0 && !talukOptions.includes(taluk)) {
      setTaluk(talukOptions[0]);
    }
  }, [district]);

  useEffect(() => {
    if (pincodeOptions.length > 0 && !pincodeOptions.includes(pincode)) {
      setPincode(pincodeOptions[0]);
    }
  }, [taluk]);

  const fetchPlacesAndPatients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const placesRes = await fetch("/api/screening-places", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const patientsRes = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (placesRes.ok) {
        const data = await placesRes.json();
        setPlaces(data);
      }
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

  useEffect(() => {
    fetchPlacesAndPatients();
  }, []);

  // Reverse geocoding helper to fetch village name, taluk, district & pincode from coordinates
  const performReverseGeocode = async (latStr: string, lonStr: string) => {
    setLatitude(latStr);
    setLongitude(lonStr);
    setGpsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latStr}&lon=${lonStr}&format=json`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "DRSMS-Outreach-Application/1.0",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;

          const villageName =
            addr.village ||
            addr.suburb ||
            addr.hamlet ||
            addr.neighbourhood ||
            addr.town ||
            addr.city_district ||
            "";

          const talukName =
            addr.town ||
            addr.county ||
            addr.city_district ||
            addr.suburb ||
            "";

          const districtName =
            addr.state_district ||
            addr.county ||
            addr.district ||
            "";

          const postCode = addr.postcode || "";
          const stateName = addr.state || "Karnataka";

          if (villageName) {
            setName((prev) => (prev.trim() ? prev : `${villageName} Camp`));
          }
          if (talukName) setTaluk(talukName.replace(/\staluku$/i, "").replace(/\staluk$/i, ""));
          if (postCode) setPincode(postCode);
          if (stateName && LOCATION_DATA[stateName]) setStateStr(stateName);

          if (districtName) {
            const matchedDistrict = Object.keys(LOCATION_DATA[stateName] || {}).find(
              (d) => d.toLowerCase().includes(districtName.toLowerCase()) || districtName.toLowerCase().includes(d.toLowerCase())
            );
            if (matchedDistrict) setDistrict(matchedDistrict);
          }

          toast({
            title: "Village & Location Auto-Detected! 📍",
            description: `Village: ${villageName || "Detected"}, Taluk: ${talukName || "Detected"} (${postCode})`,
          });
        }
      }
    } catch (err: any) {
      console.error("Reverse geocoding error:", err);
    } finally {
      setGpsLoading(false);
    }
  };

  // Google Maps URL coordinate parser with Reverse Geocoding
  const handleMapsUrlChange = (url: string) => {
    setMapsUrl(url);
    if (!url) return;

    // Detect 6-digit Indian Pincode in text/URL
    const pincodeRegex = /\b[1-9][0-9]{5}\b/;
    const pincodeMatch = url.match(pincodeRegex);
    if (pincodeMatch) {
      setPincode(pincodeMatch[0]);
    }

    // Pattern 1: search for @lat,lng
    const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const atMatch = url.match(atRegex);
    if (atMatch) {
      performReverseGeocode(atMatch[1], atMatch[2]);
      return;
    }

    // Pattern 2: search for place/lat,lng
    const placeRegex = /place\/(-?\d+\.\d+),(-?\d+\.\d+)/;
    const placeMatch = url.match(placeRegex);
    if (placeMatch) {
      performReverseGeocode(placeMatch[1], placeMatch[2]);
      return;
    }

    // Pattern 3: search for query=lat,lng
    const queryRegex = /query=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const queryMatch = url.match(queryRegex);
    if (queryMatch) {
      performReverseGeocode(queryMatch[1], queryMatch[2]);
      return;
    }

    // Fallback: search for two floating numbers comma separated (e.g. 13.695831582045086, 75.82342714503307)
    const floatRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const floatMatch = url.match(floatRegex);
    if (floatMatch) {
      performReverseGeocode(floatMatch[1], floatMatch[2]);
    }
  };

  const extractCoordinates = async () => {
    if (!mapsUrl) {
      toast({ title: "Input Required", description: "Please paste a link, address, or coordinates first.", variant: "destructive" });
      return;
    }

    // Try regex parsing first
    const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const atMatch = mapsUrl.match(atRegex);
    if (atMatch) {
      performReverseGeocode(atMatch[1], atMatch[2]);
      return;
    }

    const placeRegex = /place\/(-?\d+\.\d+),(-?\d+\.\d+)/;
    const placeMatch = mapsUrl.match(placeRegex);
    if (placeMatch) {
      performReverseGeocode(placeMatch[1], placeMatch[2]);
      return;
    }

    const queryRegex = /query=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const queryMatch = mapsUrl.match(queryRegex);
    if (queryMatch) {
      performReverseGeocode(queryMatch[1], queryMatch[2]);
      return;
    }

    const floatRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const floatMatch = mapsUrl.match(floatRegex);
    if (floatMatch) {
      performReverseGeocode(floatMatch[1], floatMatch[2]);
      return;
    }

    // Fallback geocoding search (Plus code or Address string)
    setGpsLoading(true);
    try {
      let cleanQuery = mapsUrl.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,4},\s*/i, "").trim();

      const tryGeocode = async (q: string) => {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
          headers: { 
            "Accept-Language": "en",
            "User-Agent": "DRSMS-Outreach-Application/1.0"
          }
        });
        if (res.ok) {
          const results = await res.json();
          if (results && results.length > 0) return results[0];
        }
        return null;
      };

      let match = await tryGeocode(cleanQuery);

      if (!match && cleanQuery.includes(",")) {
        const parts = cleanQuery.split(",");
        if (parts.length > 1) {
          match = await tryGeocode(parts.slice(1).join(",").trim());
        }
      }

      if (match) {
        performReverseGeocode(match.lat, match.lon);
      } else {
        throw new Error("No location found for this input string.");
      }
    } catch (err: any) {
      toast({ title: "Extraction Failed", description: err.message, variant: "destructive" });
    } finally {
      setGpsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlace(null);
    setName("");
    setShortCode("");
    setStateStr("Karnataka");
    setDistrict("Shimoga (Shivamogga)");
    setTaluk("Shimoga");
    setPincode("577201");
    setCampDate(new Date().toISOString().split("T")[0]);
    setStatus("active");
    setLatitude("");
    setLongitude("");
    setMapsUrl("");
    setSankaraUnit("Sankara Eye Hospital, Shimoga (Shivamogga)");
    setModalOpen(true);
  };

  const openEditModal = (place: ScreeningPlace) => {
    setEditingPlace(place);
    setName(place.name);
    setShortCode(place.shortCode);
    setStateStr(place.state);
    setDistrict(place.district);
    setTaluk(place.taluk || "");
    setPincode(place.pincode || "");
    setCampDate(place.campDate || new Date().toISOString().split("T")[0]);
    setStatus(place.status);
    setLatitude(place.latitude || "");
    setLongitude(place.longitude || "");
    setMapsUrl(place.mapLink || "");
    setSankaraUnit(place.sankaraUnit || "Sankara Eye Hospital, Shimoga (Shivamogga)");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !shortCode || !district || !stateStr || !campDate) {
      toast({ title: "Validation Error", description: "Name, Short Code, District, State, and Camp Date are required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const isEdit = !!editingPlace;
      const url = isEdit ? `/api/screening-places/${editingPlace.id}` : "/api/screening-places";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          shortCode, 
          district, 
          state: stateStr, 
          status, 
          latitude: latitude || null, 
          longitude: longitude || null,
          taluk,
          pincode,
          campDate,
          mapLink: mapsUrl || null,
          sankaraUnit
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save place");
      }

      toast({ title: "Success", description: `Campsite ${isEdit ? "updated" : "created"} successfully` });
      setModalOpen(false);
      fetchPlacesAndPatients();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async (place: ScreeningPlace) => {
    if (!window.confirm("Verify and finalize this camp session? This will lock entries and mark the campsite completed.")) return;
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/screening-places/${place.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "completed" })
      });
      if (!res.ok) throw new Error("Failed to finalize camp");
      toast({ title: "Camp Finalized", description: `${place.name} has been closed.` });
      fetchPlacesAndPatients();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this screening place?")) return;
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/screening-places/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete place");
      toast({ title: "Deleted", description: "Place deleted successfully" });
      setPlaces(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Leaflet Dynamic Integration Hook
  useEffect(() => {
    if (activeTab !== "map" || places.length === 0) return;

    // Load leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Load leaflet JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const L = (window as any).L;
      if (!L || !document.getElementById("camp-schedule-map")) return;

      // Find first valid coordinates to set map view center
      const firstWithCoords = places.find(p => p.latitude && p.longitude);
      const centerLat = firstWithCoords ? parseFloat(firstWithCoords.latitude!) : 13.9299; // Shivamogga center fallback
      const centerLng = firstWithCoords ? parseFloat(firstWithCoords.longitude!) : 75.5681;

      // 1. Define base tile layers
      const googleStreet = L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        attribution: "© Google Maps"
      });

      const googleSatellite = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        attribution: "© Google Maps Imagery"
      });

      const googleTerrain = L.tileLayer("https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}", {
        attribution: "© Google Maps Terrain"
      });

      const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
      });

      const darkMap = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© CartoDB"
      });

      // 2. Define overlay layers
      const googleTraffic = L.tileLayer("https://mt1.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}", {
        attribution: "© Google Traffic",
        opacity: 0.8
      });

      // 3. Initialize map with default base layer (Google Street)
      const map = L.map("camp-schedule-map", {
        center: [centerLat, centerLng],
        zoom: 9,
        layers: [googleStreet]
      });

      // 4. Create baseMaps and overlayMaps collections
      const baseMaps = {
        "Google Street": googleStreet,
        "Google Satellite": googleSatellite,
        "Google Terrain": googleTerrain,
        "OpenStreetMap": osm,
        "Sleek Dark Mode": darkMap
      };

      const overlayMaps = {
        "Live Traffic Overlay": googleTraffic
      };

      // 5. Add layer control
      L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

      places.forEach((p) => {
        if (!p.latitude || !p.longitude) return;
        const lat = parseFloat(p.latitude);
        const lng = parseFloat(p.longitude);

        // Green pin if completed, Red if active
        // SVG pin marker for 100% production reliability
        const pinColor = p.status === "completed" ? "#10B981" : "#FF6B00";
        const customIcon = L.divIcon({
          className: "custom-camp-pin",
          html: `<div style="background-color: ${pinColor}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px;">📍</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14]
        });

        // Calculate statistics
        const campPatients = allPatients.filter((pat: any) => pat.screeningPlaceCode === p.shortCode);
        const total = campPatients.length;
        const positive = campPatients.filter((pat: any) => pat.drStatus !== "No DR").length;
        const drRate = total > 0 ? Math.round((positive / total) * 100) : 0;

        const popupHTML = `
          <div style="font-family: sans-serif; padding: 4px; min-width: 160px;">
            <p style="margin: 0; font-weight: 800; font-size: 12px; color: #1e293b;">${p.name}</p>
            <p style="margin: 2px 0 6px 0; font-size: 10px; color: #94a3b8; font-family: monospace;">Camp Code: ${p.shortCode}</p>
            <div style="border-top: 1px solid #f1f5f9; padding-top: 6px; font-size: 11px; color: #475569;">
              <p style="margin: 2px 0; display: flex; justify-content: space-between;">
                <span>Total Screened:</span> <strong>${total}</strong>
              </p>
              <p style="margin: 2px 0; display: flex; justify-content: space-between;">
                <span>DR Findings:</span> <strong>${drRate}%</strong>
              </p>
            </div>
            <a href="/dashboard?camp=${p.shortCode}" style="display: block; margin-top: 8px; text-align: center; background: #FF6B00; color: white; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-weight: bold; text-decoration: none;">View Dashboard</a>
          </div>
        `;

        L.marker([lat, lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupHTML);
      });
    };
    document.body.appendChild(script);

    return () => {
      link.remove();
      script.remove();
    };
  }, [activeTab, places, allPatients]);

  const isCoordinator = user?.userType === "super_admin" || (user?.userType as string) === "admin_unit" || user?.userType === "admin";

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Camps & Screening Places</h1>
          <p className="text-sm text-slate-500">Configure clinic outreach locations and coordinate GPS settings.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* Tabs selector */}
          <div className="flex bg-white border border-slate-200 p-0.5 rounded-lg text-xs font-semibold shadow-xs">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                activeTab === "list" ? "bg-orange-50 text-[#FF6B00]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                activeTab === "map" ? "bg-orange-50 text-[#FF6B00]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Map className="h-3.5 w-3.5" /> Map View
            </button>
          </div>

          {isCoordinator && (
            <Button onClick={openCreateModal} className="bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white hover:from-[#FF6B00] hover:to-orange-600 text-xs font-semibold px-4 h-8 rounded-lg shadow-sm ml-auto">
              <Plus className="h-4 w-4 mr-1" /> Add Camp
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : activeTab === "map" ? (
        /* MAP VIEW TAB */
        <Card className="rounded-xl border border-slate-200/80 shadow-sm bg-white overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-[11px] font-extrabold text-slate-700 shrink-0">
            <span>Campsite Pin Locations Map</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="h-3 w-3 bg-red-500 rounded-full" /> Scheduled / Ongoing</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 bg-emerald-500 rounded-full" /> Completed & Verified</span>
            </div>
          </div>
          <div id="camp-schedule-map" className="w-full flex-1 relative z-10" />
        </Card>
      ) : places.length === 0 ? (
        <Card className="rounded-xl border border-slate-200/80 p-8 text-center flex flex-col items-center gap-2">
          <MapPin className="h-10 w-10 text-slate-300" />
          <h3 className="font-bold text-slate-700">No Camps Configured</h3>
          <p className="text-xs text-slate-400 max-w-sm">Camps are needed to assign field screening teams.</p>
        </Card>
      ) : (
        /* LIST VIEW TAB */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {places.map((place) => {
            const campPatients = allPatients.filter((pat: any) => pat.screeningPlaceCode === place.shortCode);
            const total = campPatients.length;
            
            return (
              <Card key={place.id} className="rounded-xl border border-slate-200/80 shadow-xs bg-white overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex flex-col justify-between h-48">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-800 text-sm truncate max-w-[180px]">{place.name}</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-mono text-[10px] font-bold rounded">
                        {place.shortCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{place.taluk}, {place.district}, {place.pincode}</p>
                    {place.sankaraUnit && (
                      <p className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded px-1.5 py-0.5 w-fit mt-1">
                        {place.sankaraUnit}
                      </p>
                    )}
                    
                    {place.latitude && place.longitude ? (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2 font-mono">
                        <MapPin className="h-3 w-3 text-[#FF6B00]" />
                        <span>{parseFloat(place.latitude).toFixed(4)}, {parseFloat(place.longitude).toFixed(4)}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-500 font-semibold mt-2">⚠️ Coordinates not set</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">Screenings collected: {total}</p>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      place.status === "completed" 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-red-50 text-red-600 border border-red-100"
                    }`}>
                      {place.status === "completed" ? "Verified & Completed" : "Ongoing / Scheduled"}
                    </span>
                    
                    <div className="flex gap-1.5">
                      {isCoordinator && place.status !== "completed" && (
                        <Button 
                          onClick={() => handleFinalize(place)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 text-[10px] h-7 px-2 font-bold"
                        >
                          Verify & Close
                        </Button>
                      )}
                      {isCoordinator && (
                        <>
                          <button 
                            onClick={() => openEditModal(place)}
                            className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(place.id)}
                            className="p-1.5 bg-white border border-slate-200 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CRUD Modal dialog overlay */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200">
            <CardHeader className="flex flex-row justify-between items-center py-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold">{editingPlace ? "Edit" : "Create"} Camp / Place</CardTitle>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="p-4 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Camp Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sankara Camp, Shimoga Rural"
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Short Code *</label>
                    <input
                      type="text"
                      disabled={!!editingPlace}
                      maxLength={6}
                      value={shortCode}
                      onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SHM01"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Camp Date *</label>
                    <input
                      type="date"
                      required
                      value={campDate}
                      onChange={(e) => setCampDate(e.target.value)}
                      className="w-full text-xs border border-slate-300 p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#FF6B00]"
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
                      <option value="completed">Completed</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Cascading location selectors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">State</label>
                    <select
                      value={stateStr}
                      onChange={(e) => setStateStr(e.target.value)}
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    >
                      {stateOptions.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">District</label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    >
                      {districtOptions.map(dt => (
                        <option key={dt} value={dt}>{dt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Taluk / Sub-District</label>
                    <input
                      type="text"
                      list="taluk-suggestions"
                      value={taluk}
                      onChange={(e) => setTaluk(e.target.value)}
                      placeholder="e.g. Shimoga Rural / Ayanur"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    />
                    <datalist id="taluk-suggestions">
                      {talukOptions.map(tk => (
                        <option key={tk} value={tk} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      list="pincode-suggestions"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 577211"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    />
                    <datalist id="pincode-suggestions">
                      {pincodeOptions.map(pc => (
                        <option key={pc} value={pc} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Responsible Sankara Unit</label>
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

                {/* Google Maps link parser */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-[#FF6B00]" /> Google Maps URL / Address / Plus Code</span>
                      <Button
                        type="button"
                        disabled={gpsLoading}
                        onClick={extractCoordinates}
                        className="bg-white hover:bg-slate-100 text-[#FF6B00] border border-slate-200 text-[10px] h-6 px-2.5 rounded-lg flex items-center gap-1 shadow-none"
                      >
                        {gpsLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
                        Extract Coordinates
                      </Button>
                    </label>
                    <input
                      type="text"
                      value={mapsUrl}
                      onChange={(e) => setMapsUrl(e.target.value)}
                      placeholder="e.g. 79F2+G4V, Karnataka 577427 or maps link"
                      className="w-full text-xs border border-slate-300 p-2 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold mb-0.5">Latitude</p>
                      <p className="font-mono text-xs font-bold text-slate-600">{latitude || "Not extracted"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold mb-0.5">Longitude</p>
                      <p className="font-mono text-xs font-bold text-slate-600">{longitude || "Not extracted"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" onClick={() => setModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 h-8 text-xs rounded-lg">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-[#FF6B00] hover:bg-[#E05E00] text-white h-8 text-xs rounded-lg px-4 flex items-center gap-1 font-semibold">
                    {saving && <RefreshCw className="h-3 w-3 animate-spin" />}
                    Save Camp
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
