import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import bannerLogoImg from "@assets/sankara_eye_icon.png";
import loginHeroImg from "@assets/netrartha_login_hero.png";
import { 
  Eye, EyeOff, Loader2, Lock, User, ShieldCheck, 
  Sparkles, Building2, Heart, Award, CheckCircle2, ArrowRight, Key
} from "lucide-react";
import { animate, createTimeline, stagger } from "animejs";

declare const particlesJS: any;

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const heroCardRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  // Initialize interactive background particles
  useEffect(() => {
    if (typeof (window as any).particlesJS === "function") {
      (window as any).particlesJS("particles-js", {
        particles: {
          number: { value: 65, density: { enable: true, value_area: 800 } },
          color: { value: ["#FF6B00", "#FFFFFF", "#38BDF8"] },
          shape: { type: "circle" },
          opacity: { value: 0.35, random: true },
          size: { value: 3, random: true },
          line_linked: { enable: true, distance: 130, color: "#FF6B00", opacity: 0.15, width: 1 },
          move: { enable: true, speed: 1.5, direction: "none", random: true, straight: false, out_mode: "out" }
        },
        interactivity: {
          events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" } },
          modes: { grab: { distance: 160, line_linked: { opacity: 0.4 } }, push: { particles_nb: 3 } }
        },
        retina_detect: true
      });
    }
  }, []);

  // Entrance animations
  useEffect(() => {
    try {
      const tl = createTimeline({});

      if (heroCardRef.current) {
        tl.add(heroCardRef.current, {
          opacity: [0, 1],
          translateX: [-30, 0],
          duration: 700,
          ease: "outQuad"
        }, 100);
      }

      if (formCardRef.current) {
        tl.add(formCardRef.current, {
          opacity: [0, 1],
          translateY: [30, 0],
          duration: 700,
          ease: "outQuad"
        }, 200);
      }

      // Title glow effect
      animate(".hero-glow-title", {
        textShadow: [
          "0 0 10px rgba(255,107,0,0.3)",
          "0 0 25px rgba(255,107,0,0.8)",
          "0 0 10px rgba(255,107,0,0.3)"
        ],
        duration: 3200,
        loop: true,
        ease: "inOutSine"
      });
    } catch (_err) {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      if (formCardRef.current) {
        animate(formCardRef.current, {
          translateX: [-8, 8, -6, 6, -4, 4, 0],
          duration: 450,
          ease: "inOutQuad"
        });
      }
      toast({
        title: "Required Fields Missing",
        description: "Please enter your Username / Employee ID and password.",
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

      if (formCardRef.current) {
        animate(formCardRef.current, {
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
      if (formCardRef.current) {
        animate(formCardRef.current, {
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

  // Quick autofill test credentials helper
  const handleQuickFill = (empId: string, defaultPwd = "Sankara@123") => {
    setUsername(empId);
    setPassword(defaultPwd);
    toast({
      title: "Account Filled! 🔑",
      description: `Loaded test credentials for User ID: ${empId}`
    });
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#070F1E] flex flex-col justify-between overflow-x-hidden font-sans text-slate-100 select-none">
      {/* Background Lighting Gradients & Particles */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,107,0,0.15)_0%,transparent_60%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.12)_0%,transparent_60%)] pointer-events-none z-0" />
      <div id="particles-js" className="absolute inset-0 w-full h-full z-0 pointer-events-none" />

      {/* Main Container */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* LEFT HERO BRANDING COLUMN (7 Cols on LG) */}
          <div ref={heroCardRef} className="lg:col-span-7 flex flex-col justify-center space-y-6">
            
            {/* Header Brand Bar */}
            <div className="inline-flex items-center gap-3 bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-xl max-w-fit">
              <img
                src={bannerLogoImg}
                alt="Sankara Eye Foundation India"
                className="h-9 sm:h-11 w-auto object-contain"
              />
            </div>

            {/* Title & Tagline */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 
                  className="hero-glow-title text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight"
                  style={{ fontFamily: "'Samarkan', serif" }}
                >
                  Netrartha
                </h1>
                <span className="bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md uppercase tracking-wider">
                  v1.0
                </span>
              </div>
              <p className="text-sm sm:text-base text-orange-400 font-bold tracking-wide uppercase">
                Serving Vision. Transforming Lives.
              </p>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed font-medium">
                Sankara Eye Foundation's Enterprise Diabetic Retinopathy (DR) Screening & Tele-Ophthalmology Management Platform.
              </p>
            </div>

            {/* High-Resolution Hero Graphic Card */}
            <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl shadow-2xl p-2 group">
              <img
                src={loginHeroImg}
                alt="Netrartha Optical AI Retina Analysis"
                className="w-full h-56 sm:h-72 object-cover rounded-2xl transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070F1E] via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <Sparkles className="h-4 w-4 text-[#FF6B00]" /> AI-Powered Retinal Grading
                </div>
                <span className="text-[11px] font-semibold text-slate-300 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  Remidio FOP Optics Compatible
                </span>
              </div>
            </div>

            {/* 50 Years Anniversary Badge */}
            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-amber-400/30 flex items-center gap-4 shadow-xl">
              <img
                src="/sankara-50th-logo.png"
                alt="Sankara 50th Golden Jubilee"
                className="h-12 sm:h-14 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-[#FFD700] text-[10px] font-black tracking-widest uppercase">
                  <Award className="h-3.5 w-3.5" /> 50 Years of Excellence (1977 - 2027)
                </div>
                <p className="text-sm font-bold text-white">
                  3 Million+ <span className="text-[#FF6B00]">Free Eye Surgeries Completed</span>
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  Covering 10+ Hospitals & 100+ Vision Centers across India
                </p>
              </div>
            </div>

          </div>

          {/* RIGHT AUTH FORM COLUMN (5 Cols on LG) */}
          <div ref={formCardRef} className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-slate-100 overflow-hidden text-slate-900">
              
              {/* Top Form Header */}
              <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 text-center relative">
                <div className="w-12 h-12 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs text-[#FF6B00]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Staff Sign In
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Enter your credentials to access Netrartha
                </p>
              </div>

              {/* Login Form */}
              <div className="p-6 sm:p-8 space-y-5">
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

                  {/* Sign In Button */}
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
                        Sign In to Portal <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Quick Autofill Test Credentials */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider text-center mb-2">
                    Quick Role Test Login
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickFill("010177")}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-[#FF6B00] border border-slate-200 hover:border-orange-300 rounded-lg text-[11px] font-bold text-left transition-colors flex items-center justify-between"
                    >
                      <span>Super Admin</span>
                      <Key className="h-3 w-3 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill("006704")}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-[#FF6B00] border border-slate-200 hover:border-orange-300 rounded-lg text-[11px] font-bold text-left transition-colors flex items-center justify-between"
                    >
                      <span>Field Screener</span>
                      <Key className="h-3 w-3 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill("ASHA001")}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-[#FF6B00] border border-slate-200 hover:border-orange-300 rounded-lg text-[11px] font-bold text-left transition-colors flex items-center justify-between"
                    >
                      <span>ASHA Worker</span>
                      <Key className="h-3 w-3 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill("VC001")}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-[#FF6B00] border border-slate-200 hover:border-orange-300 rounded-lg text-[11px] font-bold text-left transition-colors flex items-center justify-between"
                    >
                      <span>Vision Center</span>
                      <Key className="h-3 w-3 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-center text-[10px] text-slate-400 font-semibold">
                  Protected by Enterprise SSL Encryption • Sankara IT Dept
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-3 text-center text-[10px] text-slate-400/80 font-bold border-t border-white/5 bg-[#050C17]/80 backdrop-blur-md">
        © 2025 Sankara Eye Foundation India &nbsp;•&nbsp; Sri Kanchi Kamakoti Medical Trust &nbsp;•&nbsp; Netrartha v1.0
      </footer>
    </div>
  );
}
