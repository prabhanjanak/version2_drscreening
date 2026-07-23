import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LogOut, LayoutDashboard, Users, MapPin, 
  Settings, ShieldAlert, FileText, Camera,
  Activity, Menu, X, Wifi, WifiOff, User, Building2, Truck, Smartphone
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
  vision_center: "Vision Center (VC)",
};

export function AppLayout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);

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

  if (!user) return <>{children}</>;

  const getNavItems = () => {
    const items = [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ];

    const type = user.userType as string;

    if (type === "super_admin" || type === "admin" || type === "admin_unit" || type === "unit_head" || type === "vision_center") {
      items.push({ label: "Vision Centers", href: "/vision-centers", icon: Building2 });
    }

    if (type === "super_admin" || type === "admin" || type === "admin_unit" || type === "facility_manager") {
      items.push({ label: "Facility Dispatch", href: "/facility-schedule", icon: Truck });
    }

    if (type === "super_admin" || type === "admin_unit" || type === "outreach") {
      items.push({ label: "Screening Entry", href: "/patients/new", icon: Camera });
    }

    items.push({ label: "Patient Records", href: "/patients", icon: FileText });

    if (type === "super_admin" || type === "admin" || type === "admin_unit") {
      items.push(
        { label: "Camps / Places", href: "/screening-places", icon: MapPin },
        { label: "User Accounts", href: "/users", icon: Users }
      );
    }

    if (type === "super_admin" || type === "admin" || type === "admin_unit" || type === "unit_head") {
      items.push({ label: "Reports", href: "/reports", icon: Activity });
    }

    items.push({ label: "Settings", href: "/settings", icon: Settings });

    return items;
  };

  const navItems = getNavItems();
  const roleLabel = ROLE_LABELS[user.userType as string] || (user.userType as string).replace(/_/g, " ");

  const handleLogout = () => {
    localStorage.removeItem("vision2020_token");
    logout();
    setLocation("/login");
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden relative">
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
        <header className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0">
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
              onClick={handleLogout}
              className="p-1.5 text-slate-500 hover:text-slate-800"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-1.5 px-4 flex justify-around items-center z-40 shadow-lg shrink-0">
          {navItems.slice(0, 4).map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex flex-col items-center gap-0.5 p-1 transition-all ${
                  isActive ? "text-[#FF6B00]" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className="h-5.5 w-5.5" />
                <span className="text-[9px] font-bold tracking-tight">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
