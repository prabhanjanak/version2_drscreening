import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import bannerLogoImg from "@assets/sankara_eye_icon.png";
import campBgImg from "@assets/village_eye_camp_bg.png";
import { 
  Eye, EyeOff, Loader2, Lock, User, ShieldCheck, 
  Award, ArrowRight, Key, Heart, Building2, UserCheck, MapPin, Activity, Sparkles, Check
} from "lucide-react";
import { animate } from "animejs";

interface HospitalPin {
  id: string;
  city: string;
  state: string;
  x: number; // percentage in SVG
  y: number;
  surgeries: string;
  type: string;
}

const SANKARA_LOCATIONS: HospitalPin[] = [
  { id: "cbe", city: "Coimbatore", state: "Tamil Nadu (HQ)", x: 42, y: 82, surgeries: "800,000+", type: "Super Specialty Base Hospital" },
  { id: "blr", city: "Bangalore", state: "Karnataka", x: 46, y: 74, surgeries: "500,000+", type: "Super Specialty Hospital" },
  { id: "smg", city: "Shimoga", state: "Karnataka", x: 40, y: 70, surgeries: "250,000+", type: "Outreach & Base Hospital" },
  { id: "gtr", city: "Guntur", state: "Andhra Pradesh", x: 56, y: 64, surgeries: "400,000+", type: "Super Specialty Hospital" },
  { id: "hyd", city: "Hyderabad", state: "Telangana", x: 50, y: 58, surgeries: "200,000+", type: "Eye Care Center" },
  { id: "and", city: "Anand", state: "Gujarat", x: 26, y: 44, surgeries: "350,000+", type: "Super Specialty Hospital" },
  { id: "jpr", city: "Jaipur", state: "Rajasthan", x: 34, y: 32, surgeries: "200,000+", type: "Super Specialty Hospital" },
  { id: "ldh", city: "Ludhiana", state: "Punjab", x: 36, y: 18, surgeries: "300,000+", type: "Super Specialty Hospital" },
  { id: "knp", city: "Kanpur", state: "Uttar Pradesh", x: 55, y: 34, surgeries: "250,000+", type: "Super Specialty Hospital" },
  { id: "ind", city: "Indore", state: "Madhya Pradesh", x: 38, y: 46, surgeries: "180,000+", type: "Eye Care Hospital" },
  { id: "pnv", city: "Mumbai / Panvel", state: "Maharashtra", x: 28, y: 56, surgeries: "150,000+", type: "Regional Eye Hospital" },
];

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [hoveredPin, setHoveredPin] = useState<HospitalPin | null>(SANKARA_LOCATIONS[0]);

  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-cycle through hospital locations for dynamic animation
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % SANKARA_LOCATIONS.length;
      setHoveredPin(SANKARA_LOCATIONS[index]);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      if (cardRef.current) {
        animate(cardRef.current, {
          translateX: [-8, 8, -6, 6, -4, 4, 0],
          duration: 450,
          ease: "inOutQuad"
        });
      }
      toast({
        title: "Required Fields Missing",
        description: "Please enter your Username / Employee ID and Password.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: username.trim(), password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Invalid login credentials");
      }

      const data = await res.json();

      if (cardRef.current) {
        animate(cardRef.current, {
          scale: [1, 1.015, 1],
          duration: 300,
          ease: "inOutQuad",
          onComplete: () => {
            localStorage.setItem("vision2020_token", data.token);
            login(data.token, data.user, data.mustChangePassword);
            setLocation("/dashboard");
          }
        });
      } else {
        localStorage.setItem("vision2020_token", data.token);
        login(data.token, data.user, data.mustChangePassword);
        setLocation("/dashboard");
      }
    } catch (err: any) {
      if (cardRef.current) {
        animate(cardRef.current, {
          translateX: [-8, 8, -6, 6, -4, 4, 0],
          duration: 450,
          ease: "inOutQuad"
        });
      }
      toast({
        title: "Authentication Failed",
        description: err.message,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  // Quick test credential filler
  const handleQuickFill = (empId: string, roleName: string, defaultPwd = "Sankara@123") => {
    setUsername(empId);
    setPassword(defaultPwd);
    setActiveRole(roleName);
    toast({
      title: `${roleName} Loaded! 🔑`,
      description: `User ID set to '${empId}'. Click 'Sign In' to log in.`
    });
  };

  return (
    <div className="relative min-h-screen w-screen bg-slate-950 flex flex-col justify-between overflow-x-hidden font-sans select-none">
      
      {/* 1. REALISTIC EYE CAMP BACKGROUND IMAGE WITH WHITE FADING OVERLAY */}
      <div className="absolute inset-0 z-0">
        <img
          src={campBgImg}
          alt="Sankara Eye Foundation Community Outreach Camp"
          className="w-full h-full object-cover object-left-top scale-[1.02] filter brightness-90"
        />
        {/* Soft white fading gradient overlay across the right half */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/60 to-white/95 lg:from-slate-950/70 lg:via-white/80 lg:to-white" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/40 lg:hidden" />
      </div>

      {/* 2. MAIN CONTENT GRID */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* LEFT COLUMN: ANIMATED INDIA MAP & SANKARA NATIONWIDE OUTREACH */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-5 text-white">
            
            {/* Header Brand Bar */}
            <div className="inline-flex items-center gap-3 bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-xl max-w-fit">
              <img
                src={bannerLogoImg}
                alt="Sankara Eye Foundation India"
                className="h-9 sm:h-11 w-auto object-contain"
              />
            </div>

            {/* Title & Tagline */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h1 
                  className="text-4xl sm:text-5xl font-black text-white lg:text-slate-950 tracking-tight drop-shadow-md lg:drop-shadow-none"
                  style={{ fontFamily: "'Samarkan', serif" }}
                >
                  Netrartha
                </h1>
                <span className="bg-[#FF6B00] text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md uppercase tracking-wider">
                  v1.0
                </span>
              </div>
              <p className="text-sm sm:text-base text-orange-400 lg:text-[#FF6B00] font-extrabold tracking-wide uppercase">
                Serving Vision. Transforming Lives.
              </p>
              <p className="text-xs sm:text-sm text-slate-200 lg:text-slate-700 max-w-lg font-medium leading-relaxed">
                National Diabetic Retinopathy (DR) Screening & Tele-Ophthalmology Network by Sankara Eye Foundation.
              </p>
            </div>

            {/* INTERACTIVE ANIMATED INDIA MAP CARD */}
            <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-3xl p-4 border border-orange-500/30 shadow-2xl overflow-hidden group">
              
              {/* Map Header Info */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B00] animate-ping" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Sankara Super Specialty Network Across India
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                  13+ Super Specialty Hospitals
                </span>
              </div>

              {/* SVG India Map Vector with Pulsing Hospital Pins */}
              <div className="relative w-full h-64 sm:h-72 flex items-center justify-center bg-[#071325]/80 rounded-2xl p-2 border border-slate-800">
                
                {/* SVG India Map Outline Path */}
                <svg viewBox="0 0 200 220" className="w-full h-full max-h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,107,0,0.25)]">
                  {/* Stylized India Landmass Outline Path */}
                  <path
                    d="M 60,30 Q 75,10 95,15 Q 115,20 120,35 Q 125,50 140,55 Q 160,60 170,75 Q 180,90 165,100 Q 150,110 160,125 Q 170,140 155,150 Q 140,160 135,175 Q 130,190 115,200 Q 105,210 95,205 Q 85,200 80,185 Q 75,170 65,160 Q 55,150 50,135 Q 45,120 35,110 Q 25,100 30,85 Q 35,70 45,60 Z"
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke="#FF6B00"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                    className="animate-pulse"
                  />

                  {/* Connecting Animated Optic Network Lines */}
                  {SANKARA_LOCATIONS.map((loc, idx) => (
                    <line
                      key={`line-${loc.id}`}
                      x1="42"
                      y1="82"
                      x2={loc.x * 2}
                      y2={loc.y * 2.2}
                      stroke="rgba(255, 107, 0, 0.25)"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                  ))}

                  {/* Pulsing Hospital Pin Markers */}
                  {SANKARA_LOCATIONS.map((loc) => {
                    const isSelected = hoveredPin?.id === loc.id;
                    const cx = loc.x * 2;
                    const cy = loc.y * 2.2;

                    return (
                      <g
                        key={loc.id}
                        className="cursor-pointer transition-transform duration-300 hover:scale-125"
                        onMouseEnter={() => setHoveredPin(loc)}
                        onClick={() => setHoveredPin(loc)}
                      >
                        {/* Sonar Ripple Ring */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? "7" : "4"}
                          fill="none"
                          stroke={isSelected ? "#FF6B00" : "#38BDF8"}
                          strokeWidth="1"
                          opacity="0.8"
                        >
                          <animate
                            attributeName="r"
                            values={isSelected ? "4;12;4" : "3;8;3"}
                            dur={isSelected ? "1.5s" : "3s"}
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.9;0.1;0.9"
                            dur={isSelected ? "1.5s" : "3s"}
                            repeatCount="indefinite"
                          />
                        </circle>

                        {/* Solid Pin Core */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? "4" : "2.5"}
                          fill={isSelected ? "#FF6B00" : "#FFFFFF"}
                          stroke="#000000"
                          strokeWidth="0.8"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Live Tooltip Card for Selected Hospital Location */}
                {hoveredPin && (
                  <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 backdrop-blur-md p-2.5 rounded-xl border border-orange-500/40 flex items-center justify-between shadow-lg transition-all animate-fadeIn">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#FF6B00]" />
                        <span className="font-extrabold text-xs text-white">
                          Sankara Eye Hospital — {hoveredPin.city}
                        </span>
                        <span className="text-[9px] bg-orange-500/20 text-orange-400 font-bold px-1.5 py-0.5 rounded">
                          {hoveredPin.state}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 font-medium">
                        {hoveredPin.type} &bull; <strong className="text-amber-400">{hoveredPin.surgeries} Free Surgeries</strong>
                      </p>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Bottom Ticker */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-300 font-semibold px-1">
                <span className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> 3M+ Surgeries
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-blue-400" /> 100+ Vision Centers
                </span>
                <span className="flex items-center gap-1 text-[#FF6B00]">
                  <Heart className="h-3.5 w-3.5" /> 80% Free Surgeries
                </span>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: LOGIN FORM & TEST LOGINS PANEL */}
          <div ref={cardRef} className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.25)] border border-slate-200 overflow-hidden text-slate-900">
              
              {/* Form Header */}
              <div className="p-6 sm:p-7 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 text-center relative">
                <div className="w-12 h-12 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-xs text-[#FF6B00]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Staff Sign In
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Enter your credentials or click a test login below
                </p>
              </div>

              {/* Login Inputs */}
              <div className="p-6 sm:p-7 space-y-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Username / Employee ID *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="h-4.5 w-4.5" />
                      </span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. 010177, ASHA001, VC001"
                        className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Password *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4.5 w-4.5" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter account password"
                        className="w-full h-11 pl-10 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Authenticating...
                      </>
                    ) : (
                      <>
                        Sign In to Netrartha <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* TEST LOGINS QUICK SELECTION PANEL */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-[#FF6B00]" /> 1-Click Test Logins
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400">Click to autofill</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickFill("010177", "Super Admin")}
                      className={`p-2 rounded-xl text-left border text-xs transition-all flex items-center justify-between ${
                        activeRole === "Super Admin"
                          ? "bg-orange-50 border-[#FF6B00] text-[#FF6B00] shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-extrabold text-[11px] leading-tight">Super Admin</p>
                        <p className="text-[9px] font-mono text-slate-400">ID: 010177</p>
                      </div>
                      <Key className="h-3.5 w-3.5 opacity-60" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickFill("006704", "Field Screener")}
                      className={`p-2 rounded-xl text-left border text-xs transition-all flex items-center justify-between ${
                        activeRole === "Field Screener"
                          ? "bg-orange-50 border-[#FF6B00] text-[#FF6B00] shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-extrabold text-[11px] leading-tight">Field Screener</p>
                        <p className="text-[9px] font-mono text-slate-400">ID: 006704</p>
                      </div>
                      <Key className="h-3.5 w-3.5 opacity-60" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickFill("ASHA001", "ASHA Worker")}
                      className={`p-2 rounded-xl text-left border text-xs transition-all flex items-center justify-between ${
                        activeRole === "ASHA Worker"
                          ? "bg-orange-50 border-[#FF6B00] text-[#FF6B00] shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-extrabold text-[11px] leading-tight flex items-center gap-1">
                          <Heart className="h-3 w-3 text-rose-500" /> ASHA Worker
                        </p>
                        <p className="text-[9px] font-mono text-slate-400">ID: ASHA001</p>
                      </div>
                      <Key className="h-3.5 w-3.5 opacity-60" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickFill("VC001", "Vision Center")}
                      className={`p-2 rounded-xl text-left border text-xs transition-all flex items-center justify-between ${
                        activeRole === "Vision Center"
                          ? "bg-orange-50 border-[#FF6B00] text-[#FF6B00] shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-extrabold text-[11px] leading-tight flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-blue-500" /> Vision Center
                        </p>
                        <p className="text-[9px] font-mono text-slate-400">ID: VC001</p>
                      </div>
                      <Key className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-center text-[10px] text-slate-400 font-semibold">
                  Protected by Enterprise SSL Encryption • Sankara Eye Foundation
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-3 text-center text-[10px] text-slate-500 font-bold border-t border-slate-200 bg-white/90 backdrop-blur-md">
        © 2025 Sankara Eye Foundation India &nbsp;•&nbsp; Sri Kanchi Kamakoti Medical Trust &nbsp;•&nbsp; Netrartha v1.0
      </footer>
    </div>
  );
}
