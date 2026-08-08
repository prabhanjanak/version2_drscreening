import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetMe, CurrentUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: CurrentUser, mustChangePassword?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(localStorage.getItem("vision2020_token"));
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const isPublicRoute = (path: string): boolean => {
    const cleanPath = path.toLowerCase().replace(/\/$/, "");
    const publics = ["", "/", "/login", "/set-password", "/forgot-password", "/reset-password", "/file-submission", "/tracks", "/flyer", "/tracks-rsvp", "/brochurev2020"];
    if (publics.includes(cleanPath)) return true;
    if (cleanPath.startsWith("/agenda") || cleanPath.startsWith("/q/") || cleanPath.startsWith("/tracks")) return true;
    return false;
  };

  // Ref for inactivity timer
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: user, isLoading: isMeLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    } as any
  });

  // Handle auto-redirect if not logged in on a protected route
  useEffect(() => {
    if (!token && !isPublicRoute(location)) {
      setLocation("/login");
    }
  }, [token, location]);

  useEffect(() => {
    if (error) {
      const status = (error as any).status || (error as any).statusCode;
      if (status === 401) {
        localStorage.removeItem("vision2020_token");
        setToken(null);
        if (!isPublicRoute(location)) {
          setLocation("/login");
        }
      } else if (status === 403) {
        toast({
          title: "Permission Denied 🚫",
          description: "You do not have relevant permissions to perform this action. Please contact Super Admin.",
          variant: "destructive",
        });
      }
    }
  }, [error, location]);

  // Auto-logout completely disabled — sessions remain permanently active until explicit user logout

  const login = (newToken: string, newUser: CurrentUser, mustChangePassword?: boolean) => {
    localStorage.setItem("vision2020_token", newToken);
    setToken(newToken);
    queryClient.setQueryData(["/api/auth/me"], newUser);

    if (mustChangePassword && newUser.userType !== "participant") {
      setLocation("/staff/change-password");
      return;
    }

    // Route by role
    switch (newUser.userType as string) {
      case "super_admin":
      case "admin":
        setLocation("/admin/dashboard");
        break;
      case "track_coordinator":
        setLocation("/track/dashboard");
        break;
      case "food_coordinator":
        setLocation("/food/dashboard");
        break;
      case "scientific_committee":
        setLocation("/scientific/submissions");
        break;
      case "pr_member":
        setLocation("/admin/submissions");
        break;
      default:
        setLocation("/participant/dashboard");
    }
  };

  const logout = () => {
    const storedToken = localStorage.getItem("vision2020_token");
    if (storedToken) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${storedToken}` },
      }).catch(() => {});
    }
    localStorage.removeItem("vision2020_token");
    setToken(null);
    queryClient.setQueryData(["/api/auth/me"], null);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user: user || null, token, isLoading: !!token && isMeLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
