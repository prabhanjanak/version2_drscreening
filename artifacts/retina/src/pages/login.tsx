import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import bannerLogoImg from "@assets/sankara_eye_icon.png";
import screeningPhotoImg from "@assets/patient_eye_screening.png";
import { 
  Eye, EyeOff, Loader2, Lock, User, ShieldCheck, 
  Award, ArrowRight, Heart, Camera, CheckCircle2
} from "lucide-react";
import { animate } from "animejs";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative min-h-screen w-screen bg-slate-900 flex flex-col justify-between overflow-x-hidden font-sans select-none">
      
      {/* 1. REALISTIC PATIENT EYE SCREENING BACKGROUND IMAGE */}
      <div className="absolute inset-0 z-0">
        <img
          src={screeningPhotoImg}
          alt="Indian doctor conducting eye screening on elderly village patient"
          className="w-full h-full object-cover object-[30%_35%] scale-[1.02]"
        />
        {/* Soft white fading gradient overlay across the right half for high readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/50 to-white/95 sm:to-white/95 lg:from-slate-950/40 lg:via-white/75 lg:to-white" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30 lg:hidden" />
      </div>

      {/* 2. MAIN 2-COLUMN CONTENT */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* LEFT COLUMN: BRANDING & FEATURED PATIENT SCREENING CARD */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-5 text-white drop-shadow-md">
            
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
                  className="text-4xl sm:text-5xl font-black text-white lg:text-slate-900 tracking-tight drop-shadow-md lg:drop-shadow-none"
                  style={{ fontFamily: "'Samarkan', serif" }}
                >
                  Netrartha
                </h1>
                <span className="bg-[#FF6B00] text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md uppercase tracking-wider">
                  v1.0.2
                </span>
              </div>
              <p className="text-sm sm:text-base text-orange-300 lg:text-[#FF6B00] font-extrabold tracking-wide uppercase">
                Serving Vision. Transforming Lives.
              </p>
              <p className="text-xs sm:text-sm text-slate-200 lg:text-slate-700 max-w-lg font-medium leading-relaxed">
                Diabetic Retinopathy (DR) Community Screening & Tele-Ophthalmology Portal for Sankara Eye Foundation Outreach Staff, Doctors & Field Referrals.
              </p>
            </div>

            {/* Featured Patient Screening Photo Card */}
            <div className="relative rounded-2xl overflow-hidden border border-white/30 bg-slate-950/80 backdrop-blur-md p-2 shadow-2xl max-w-lg group">
              <img
                src={screeningPhotoImg}
                alt="Doctor screening village patient eye with camera"
                className="w-full h-48 sm:h-56 object-cover object-[25%_35%] rounded-xl transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-85" />
              
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-[#FF6B00]" /> Village Eye Screening Camp — Sankara Outreach
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded border border-amber-300/30">
                  DR Tele-Ophthalmology
                </span>
              </div>
            </div>

            {/* 50 Years Golden Jubilee Banner */}
            <div className="bg-slate-950/85 backdrop-blur-md rounded-2xl p-3.5 border border-amber-400/30 flex items-center gap-3.5 shadow-xl max-w-lg">
              <img
                src="/sankara-50th-logo.png"
                alt="Sankara 50th Golden Jubilee"
                className="h-11 sm:h-13 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)] shrink-0"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-[#FFD700] text-[10px] font-black tracking-widest uppercase">
                  <Award className="h-3.5 w-3.5" /> 50 Years of Service (1977 - 2027)
                </div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  3 Million+ <span className="text-[#FF6B00]">Free Eye Surgeries Completed</span>
                </p>
                <p className="text-[10px] text-slate-300 font-medium">
                  Reaching Underserved Rural & Tribal Communities Across India
                </p>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: LOGIN FORM CARD */}
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
                  Enter your employee credentials to sign in
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
                        placeholder="Enter employee ID (e.g., 010177)"
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
        © 2025 Sankara Eye Foundation India &nbsp;•&nbsp; Sri Kanchi Kamakoti Medical Trust &nbsp;•&nbsp; Netrartha v1.0.2
      </footer>
    </div>
  );
}
