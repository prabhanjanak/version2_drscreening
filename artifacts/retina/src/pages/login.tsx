import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import bannerLogoImg from "@assets/sankara_eye_icon.png";
import { Eye, EyeOff, Loader2, Lock, User, Shield } from "lucide-react";
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

  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Initialize particles.js background with interactive hover and click ripples
  useEffect(() => {
    if (typeof (window as any).particlesJS === "function") {
      (window as any).particlesJS("particles-js", {
        particles: {
          number: {
            value: 70,
            density: {
              enable: true,
              value_area: 800,
            },
          },
          color: {
            value: ["#ff6b00", "#ffffff"],
          },
          shape: {
            type: "circle",
          },
          opacity: {
            value: 0.45,
            random: true,
            anim: {
              enable: true,
              speed: 1,
              opacity_min: 0.1,
              sync: false,
            },
          },
          size: {
            value: 3.5,
            random: true,
            anim: {
              enable: true,
              speed: 1.5,
              size_min: 0.3,
              sync: false,
            },
          },
          line_linked: {
            enable: true,
            distance: 145,
            color: "#ff6b00",
            opacity: 0.18,
            width: 1,
          },
          move: {
            enable: true,
            speed: 1.8,
            direction: "none",
            random: true,
            straight: false,
            out_mode: "out",
            bounce: false,
          },
        },
        interactivity: {
          detect_on: "window",
          events: {
            onhover: {
              enable: true,
              mode: ["grab", "repulse"],
            },
            onclick: {
              enable: true,
              mode: "push",
            },
            resize: true,
          },
          modes: {
            grab: {
              distance: 180,
              line_linked: {
                opacity: 0.5,
              },
            },
            repulse: {
              distance: 140,
              duration: 0.4,
            },
            push: {
              particles_nb: 4,
            },
          },
        },
        retina_detect: true,
      });
    }
  }, []);

  // Entrance animations timed at 500-700ms with easing
  useEffect(() => {
    const tl = createTimeline({});

    tl.add(logoRef.current!, {
      translateY: [-35, 0],
      opacity: [0, 1],
      duration: 600,
      ease: "outQuad",
    }, 50)
    .add(badgeRef.current!, {
      translateY: [25, 0],
      opacity: [0, 1],
      duration: 600,
      ease: "outQuad",
    }, 150)
    .add(brandRef.current!, {
      opacity: [0, 1],
      duration: 500,
      ease: "outQuad",
    }, 250)
    .add(cardRef.current!, {
      translateY: [35, 0],
      opacity: [0, 1],
      duration: 650,
      ease: "outQuad",
    }, 300);

    // Staggered letters for Netrartha logo
    animate(".nr-letter", {
      opacity: [0, 1],
      translateY: [10, 0],
      delay: stagger(35, { start: 300 }),
      duration: 350,
      ease: "outQuad",
    });

    // Elegant pulse glow on title
    animate(".nr-title-glow", {
      textShadow: [
        "0 0 8px rgba(255,107,0,0.25)",
        "0 0 24px rgba(255,107,0,0.75)",
        "0 0 8px rgba(255,107,0,0.25)",
      ],
      duration: 3000,
      ease: "inOutSine",
      loop: true,
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      animate(cardRef.current!, {
        translateX: [-8, 8, -6, 6, -4, 4, 0],
        duration: 450,
        ease: "inOutQuad",
      });
      toast({
        title: "Required Fields",
        description: "Please enter your username and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: username, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Login failed");
      }

      const data = await res.json();

      animate(cardRef.current!, {
        scale: [1, 1.015, 1],
        duration: 300,
        ease: "inOutQuad",
        onComplete: () => {
          localStorage.setItem("vision2020_token", data.token);
          login(data.token, data.user, data.mustChangePassword);
          setLocation("/dashboard");
        },
      });
    } catch (err: any) {
      animate(cardRef.current!, {
        translateX: [-8, 8, -6, 6, -4, 4, 0],
        duration: 450,
        ease: "inOutQuad",
      });
      toast({
        title: "Login Failed",
        description: err.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const nameLetters = "Netrartha".split("").map((ch, i) => (
    <span key={i} className="nr-letter inline-block" style={{ opacity: 0 }}>
      {ch}
    </span>
  ));

  return (
    <div className="relative h-screen w-screen bg-[#0a192f] flex flex-col justify-between items-center py-4 px-4 overflow-hidden select-none">
      {/* Background vignette & subtle gradient layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,107,0,0.05)_0%,transparent_75%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a192f]/40 to-[#061020]/90 pointer-events-none z-0" />

      {/* Particles background */}
      <div
        id="particles-js"
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      />

      {/* Content Stack - Vertically Centered & Strictly constrained to fit on 100vh */}
      <div
        ref={containerRef}
        className="relative z-10 flex-1 w-full max-w-2xl flex flex-col justify-center items-center gap-3 sm:gap-4 md:gap-5"
      >
        {/* 1. SANKARA HEADER LOGO (Rounded, padded, shadow glass effect, hover lift) */}
        <div
          ref={logoRef}
          className="w-full max-w-[660px] bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.35),0_0_15px_rgba(255,107,0,0.1)] border border-slate-100/10 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_15px_40px_rgba(255,107,0,0.22)] flex items-center justify-center cursor-pointer"
          style={{ opacity: 0 }}
        >
          <img
            src={bannerLogoImg}
            alt="Sankara Eye Foundation - India"
            className="w-[96%] sm:w-[98%] max-w-[620px] h-auto object-contain transition-transform duration-300 hover:scale-[1.015]"
          />
        </div>

        {/* 2. GOLDEN ANNIVERSARY BANNER (Dark, elegant, gold accent card with glow) */}
        <div
          ref={badgeRef}
          className="w-full max-w-[600px] bg-slate-950/75 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-[#ffd700]/25 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-[#ffd700]/45 hover:bg-slate-950/85"
          style={{ opacity: 0 }}
        >
          <div className="relative flex-shrink-0">
            {/* Subtle glow behind gold badge */}
            <div className="absolute inset-0 bg-[#ffd700]/15 rounded-full blur-md animate-pulse pointer-events-none" />
            <img
              src="/sankara-50th-logo.png"
              alt="Sankara 50th Anniversary Badge"
              className="relative h-11 sm:h-13 w-auto object-contain filter drop-shadow-[0_2px_6px_rgba(255,215,0,0.25)] transition-transform duration-300 hover:scale-105"
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[8px] sm:text-[9px] font-black text-[#ffd700] uppercase tracking-[0.2em] leading-none mb-1">
              Serving India Since 1977
            </span>
            <span className="text-sm sm:text-base font-bold text-white leading-tight mb-0.5">
              3 Million+ <span className="text-[#FF6B00]">Free Eye Surgeries</span>
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium leading-tight">
              Transforming Lives Through Quality Vision Care
            </span>
          </div>
        </div>

        {/* 3. NETRARTHA BRANDING (Samarkan font, bolder, less letter spacing) */}
        <div
          ref={brandRef}
          className="text-center flex flex-col items-center gap-0.5"
          style={{ opacity: 0 }}
        >
          <div className="flex items-baseline justify-center gap-2">
            <h1
              className="nr-title-glow text-white font-extrabold text-3xl sm:text-4xl leading-none transition-all duration-300 hover:scale-[1.01]"
              style={{
                fontFamily: "'Samarkan', serif",
                letterSpacing: "-0.05em",
                fontWeight: 900,
              }}
            >
              {nameLetters}
            </h1>
            <span className="text-[9px] font-black text-[#FF6B00] bg-orange-500/10 border border-orange-500/30 rounded-md px-1.5 py-0.5 uppercase tracking-wider align-super transition-all duration-300 hover:bg-orange-500/20 hover:scale-105 cursor-pointer">
              v1
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-300 font-semibold tracking-wider mt-1 uppercase">
            Serving Vision. Transforming Lives.
          </p>
        </div>

        {/* 4. LOGIN CARD (24px rounded corners, minimal glass blur, soft shadow, lift hover) */}
        <div
          ref={cardRef}
          className="w-full max-w-[450px] bg-white/95 backdrop-blur-xs rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.4),0_0_20px_rgba(0,0,0,0.05)] overflow-hidden border border-slate-100/50 transition-all duration-500 hover:translate-y-[-2px] hover:shadow-[0_25px_60px_rgba(255,107,0,0.12)]"
          style={{ opacity: 0 }}
        >
          <div className="p-6 sm:p-8">
            {/* Header section with Shield Icon */}
            <div className="text-center mb-5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#e55a00] flex items-center justify-center mx-auto mb-3 shadow-md shadow-orange-500/20 transition-transform duration-300 hover:rotate-6">
                <Shield className="w-5.5 h-5.5 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Portal Login
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-1">
                Diabetic Retinopathy Screening Management System
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-username"
                  className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider"
                >
                  Username / Employee ID
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4.5 h-4.5" />
                  </span>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter employee ID (e.g., 010177)"
                    required
                    aria-label="Username or Employee ID"
                    className="block w-full h-[50px] pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-[14px] text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00] focus:bg-white transition-all text-slate-900 font-semibold"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-password"
                  className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4.5 h-4.5" />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    aria-label="Password"
                    className="block w-full h-[50px] pl-11 pr-11 bg-slate-50 border border-slate-200 rounded-[14px] text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00] focus:bg-white transition-all text-slate-900 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full h-[50px] bg-gradient-to-r from-[#FF6B00] to-[#e55a00] text-white font-bold text-sm rounded-[14px] shadow-md shadow-orange-500/20 hover:scale-[1.01] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                )}
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="text-center text-[9px] text-slate-400 font-bold mt-5 leading-relaxed">
              © 2025 Sankara Eye Foundation – India &nbsp;·&nbsp; Sri Kanchi
              Kamakoti Medical Trust
            </p>
          </div>
        </div>
      </div>

      {/* 5. FOOTER */}
      <footer className="relative z-10 w-full text-center text-[9px] text-slate-400/80 font-bold tracking-widest pb-1 sm:pb-2 mt-auto">
        © Sankara Eye Foundation India &nbsp;·&nbsp; Netrartha v1 &nbsp;·&nbsp; Built by Information Systems Department
      </footer>
    </div>
  );
}
