import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { 
  LogOut, LayoutDashboard, Users, MapPin, 
  Settings, ShieldAlert, FileText, Camera,
  Activity, Menu, X, WifiOff, User, Building2, Truck, Smartphone, MoreHorizontal, ChevronRight, Heart, PhoneCall, BarChart3
} from "lucide-react";
import sankaraTextBanner from "@assets/sankara_eye_icon.png"; /* SANKARA EYE FOUNDATION - INDIA text banner */
import { UserProfileDialog } from "./user-profile-dialog";
import { FloatingParticles } from "./floating-particles";
import { offlineDB } from "@/lib/offline-db";

interface LayoutProps {
  children: ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  admin_unit: "Admin - Unit Level",
  unit_head: "Unit Head",
  outreach: "Outreach / Field Staff",
  facility_manager: "Facility Manager (Logistics)",
  ophthalmic_officer: "Ophthalmic Officer",
  vision_center: "Vision Center (VC)",
  asha_worker: "ASHA Worker",
};

export function AppLayout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(async () => {
      try {
        const queue = await offlineDB.getAllEntries();
        setOfflineCount(queue.length);
      } catch {}
    }, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  if (!user) return <>{children}</>;

  const getNavItems = () => {
    const type = user.userType as string;

    // Special dedicated 2 tabs for Ophthalmic Officers
    if (type === "ophthalmic_officer" || type === "asha_worker") {
      return [
        { label: "1. Refer a Patient", href: "/asha-referrals", icon: Heart },
        { label: "2. My Referrals", href: "/asha-referrals", icon: FileText },
        { label: "Settings", href: "/settings", icon: Settings },
      ];
    }

    const items = [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ];

    if (type === "super_admin" || type === "admin" || type === "admin_unit" || type === "unit_head" || type === "vision_center") {
      items.push({ label: "Vision Centers", href: "/vision-centers", icon: Building2 });
    }

    // Patient Referral Portal (ASHA Workers, Vision Centers, Outreach & Management)
    if (type === "super_admin" || type === "admin" || type === "admin_unit" || type === "unit_head" || type === "outreach" || type === "vision_center") {
      items.push({ label: "Patient Referral", href: "/asha-referrals", icon: Heart });
      items.push({ label: "Follow Up", href: "/follow-up", icon: PhoneCall });
    }

    if (type === "super_admin" || type === "admin" || type === "admin_unit" || type === "facility_manager") {
      items.push({ label: "Facility Dispatch", href: "/facility-schedule", icon: Truck });
    }

    if (type === "super_admin" || type === "admin" || type === "admin_unit" || type === "outreach" || type === "field_user") {
      items.push({ label: "Screening Entry", href: "/patients/new", icon: Camera });
    }

    items.push({ label: "Patient Records", href: "/patients", icon: FileText });

    if (type === "super_admin" || type === "admin" || type === "admin_unit") {
      items.push(
        { label: "Camps / Places", href: "/screening-places", icon: MapPin },
        { label: "User Accounts", href: "/users", icon: Users }
      );
    }

    if (type === "super_admin" || type === "admin") {
      items.push({ label: "Analytics & Usage", href: "/analytics", icon: BarChart3 });
    }

    if (type === "super_admin" || type === "admin" || type === "admin_unit" || type === "unit_head") {
      items.push({ label: "Reports", href: "/reports", icon: Activity });
    }

    items.push({ label: "Settings", href: "/settings", icon: Settings });

    return items;
  };

  const navItems = getNavItems();
  const roleLabel = ROLE_LABELS[user.userType as string] || (user.userType as string).replace(/_/g, " ");
  const patientRecords = navItems.find((item) => item.href === "/patients");
  const screeningEntry = navItems.find((item) => item.href === "/patients/new");
  const mobilePrimaryItems = [navItems[0], screeningEntry ?? patientRecords, patientRecords]
    .filter((item, index, items): item is (typeof navItems)[number] => Boolean(item) && items.findIndex((candidate) => candidate?.href === item?.href) === index);
  const mobileMenuItems = navItems.filter((item) => !mobilePrimaryItems.some((primary) => primary.href === item.href));

  const handleLogout = () => {
    localStorage.removeItem("vision2020_token");
    logout();
    setLocation("/login");
  };

  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col md:flex-row overflow-hidden relative">
      <FloatingParticles />

      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r border-slate-200/80 shrink-0 z-20">
        {/* Hospital Branding Header - SANKARA EYE FOUNDATION full-width on white */}
        <div className="bg-white border-b border-slate-200 flex items-center justify-center p-3">
          <img
            src={sankaraTextBanner}
            alt="Sankara Eye Foundation - India"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
        {/* App Name Branding */}
        <div className="text-center py-3 border-b border-slate-100 bg-white">
          <span
            className="text-2xl text-[#0B2545] tracking-wide"
            style={{ fontFamily: "'Samarkan', serif" }}
          >Netrartha</span>
          <span className="text-[9px] font-bold text-[#FF6B00] tracking-widest uppercase ml-1">v1</span>
          <p className="text-[9px] text-slate-400 italic mt-0.5">Empowering Vision Care</p>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive 
                    ? "bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-orange-100 rounded-lg flex items-center justify-center font-bold text-[#FF6B00] text-xs">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-800 text-xs truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{roleLabel}</p>
            </div>
          </div>

          <a 
            href="/api/downloads/Netrartha-v1.apk" 
            download="Netrartha-v1.apk"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#FF6B00] hover:bg-[#D95B00] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Smartphone className="h-4 w-4" />
            Download Android App (.apk)
          </a>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        
         {/* Mobile Sticky Header */}
        <header className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0 pt-[max(0.625rem,env(safe-area-inset-top))]">
          <div className="flex items-center">
            <img src={sankaraTextBanner} alt="Sankara Eye Foundation" style={{ height: "40px", width: "auto" }} />
          </div>
          
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="p-1.5 bg-amber-50 text-amber-500 rounded-md">
                <WifiOff className="h-4 w-4" />
              </span>
            )}
            {offlineCount > 0 && (
              <span className="px-2 py-0.5 bg-orange-100 text-[#FF6B00] text-[9px] font-bold rounded-full">
                {offlineCount} unsynced
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="p-1.5 text-slate-500 active:scale-90 transition-transform"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location}
              className="flex flex-1 min-h-0"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav aria-label="Primary navigation" className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 pt-1.5 px-3 flex justify-around items-center z-40 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] shrink-0 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {mobilePrimaryItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`relative min-w-15 flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all active:scale-95 ${
                  isActive ? "text-[#FF6B00]" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {isActive && <motion.span layoutId="mobile-nav-active" className="absolute inset-0 rounded-xl bg-orange-50 -z-10" transition={{ type: "spring", stiffness: 360, damping: 28 }} />}
                <Icon className="h-5.5 w-5.5" />
                <span className="text-[9px] font-bold tracking-tight">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`relative min-w-15 flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all active:scale-95 ${mobileMenuOpen ? "text-[#FF6B00]" : "text-slate-400"}`}
            aria-label="Show more navigation options"
          >
            <MoreHorizontal className="h-5.5 w-5.5" />
            <span className="text-[9px] font-bold tracking-tight">More</span>
          </button>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div className="md:hidden fixed inset-0 z-50" initial="closed" animate="open" exit="closed">
              <motion.button
                aria-label="Close navigation menu"
                className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
                onClick={() => setMobileMenuOpen(false)}
                variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }}
                transition={{ duration: 0.18 }}
              />
              <motion.section
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
                className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-3 shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
                variants={{ closed: { y: "105%" }, open: { y: 0 } }}
                transition={{ type: "spring", stiffness: 360, damping: 32 }}
              >
                <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">Netrartha</p>
                    <p className="text-[10px] font-semibold text-slate-400">{roleLabel}</p>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="rounded-full bg-slate-100 p-2 text-slate-600 active:scale-90 transition-transform">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {mobileMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition-colors ${isActive ? "bg-orange-50 text-[#FF6B00]" : "text-slate-700 active:bg-slate-50"}`}>
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? "bg-orange-100" : "bg-slate-100 text-slate-500"}`}><Icon className="h-4.5 w-4.5" /></span>
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-5 border-t border-slate-100 pt-4 space-y-2">
                  <button onClick={() => { setMobileMenuOpen(false); setProfileOpen(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 active:bg-slate-50">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-xs font-extrabold text-[#FF6B00]">{user.name.slice(0, 2).toUpperCase()}</span>
                    <span className="flex-1 truncate">{user.name}</span><User className="h-4 w-4 text-slate-400" />
                  </button>
                  <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-3 text-xs font-bold text-slate-700 active:scale-[0.98] transition-transform"><LogOut className="h-4 w-4" /> Logout</button>
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <UserProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        token={localStorage.getItem("vision2020_token")}
      />
    </div>
  );
}
