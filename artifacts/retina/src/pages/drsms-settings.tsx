import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Shield, RefreshCw, Wifi, WifiOff, Database, Trash2, Mail, 
  MessageSquare, Key, Save, Send, Eye, EyeOff, Loader2, CheckCircle2, Lock, Smartphone
} from "lucide-react";
import { offlineDB, OfflineScreeningEntry } from "@/lib/offline-db";

export default function DrsmsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const isSuperAdmin = user?.userType === "super_admin";

  // Offline queue state
  const [offlineQueue, setOfflineQueue] = useState<OfflineScreeningEntry[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  // Super Admin Settings state
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Email SMTP
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // WhatsApp Meta Cloud API
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [whatsappAccessToken, setWhatsappAccessToken] = useState("");
  const [whatsappWabaId, setWhatsappWabaId] = useState("");
  const [whatsappTemplateName, setWhatsappTemplateName] = useState("drsms_otp_code");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [showWaToken, setShowWaToken] = useState(false);

  // Security Policies
  const [requireOtpFirstLogin, setRequireOtpFirstLogin] = useState(true);
  const [requireOtpPasswordChange, setRequireOtpPasswordChange] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState("30");

  // Test Dialogs
  const [emailTestOpen, setEmailTestOpen] = useState(false);
  const [emailTestRecipient, setEmailTestRecipient] = useState((user as any)?.email || "prabhanjan@sankaraeye.com");
  const [testingEmail, setTestingEmail] = useState(false);

  const [waTestOpen, setWaTestOpen] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState((user as any)?.mobile || "8951568286");
  const [testingWa, setTestingWa] = useState(false);


  const fetchOfflineCount = async () => {
    try {
      const entries = await offlineDB.getAllEntries();
      setOfflineQueue(entries);
    } catch (err) {
      console.error("Failed to read offline queue", err);
    }
  };

  const fetchSettings = async () => {
    if (!isSuperAdmin) return;
    setLoadingSettings(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSmtpHost(data.smtp_host || "");
        setSmtpPort(data.smtp_port || "587");
        setSmtpUser(data.smtp_user || "");
        setSmtpPass(data.smtp_pass || "");
        setSmtpSecure(Boolean(data.smtp_secure));
        setSmtpFromEmail(data.smtp_from_email || "");
        setSmtpFromName(data.smtp_from_name || "");
        setEmailEnabled(Boolean(data.email_enabled));

        setWhatsappPhoneNumberId(data.whatsapp_phone_number_id || "");
        setWhatsappAccessToken(data.whatsapp_access_token || "");
        setWhatsappWabaId(data.whatsapp_waba_id || "");
        setWhatsappTemplateName(data.whatsapp_template_name || "drsms_otp_code");
        setWhatsappEnabled(Boolean(data.whatsapp_enabled));

        setRequireOtpFirstLogin(Boolean(data.require_otp_first_login));
        setRequireOtpPasswordChange(Boolean(data.require_otp_password_change));
        setSessionTimeoutMinutes(String(data.session_timeout_minutes || 30));
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchOfflineCount();
    if (isSuperAdmin) {
      fetchSettings();
    }
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isSuperAdmin]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_pass: smtpPass,
          smtp_secure: smtpSecure,
          smtp_from_email: smtpFromEmail,
          smtp_from_name: smtpFromName,
          email_enabled: emailEnabled,

          whatsapp_phone_number_id: whatsappPhoneNumberId,
          whatsapp_access_token: whatsappAccessToken,
          whatsapp_waba_id: whatsappWabaId,
          whatsapp_template_name: whatsappTemplateName,
          whatsapp_enabled: whatsappEnabled,

          require_otp_first_login: requireOtpFirstLogin,
          require_otp_password_change: requireOtpPasswordChange,
          session_timeout_minutes: parseInt(sessionTimeoutMinutes, 10) || 30,
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save settings");
      }

      toast({
        title: "Settings Saved ✓",
        description: "Super Admin system configuration updated successfully.",
      });
      fetchSettings();
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          secure: smtpSecure,
          fromEmail: smtpFromEmail,
          fromName: smtpFromName,
          recipient: emailTestRecipient
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      toast({
        title: "Email Test Passed ✓",
        description: data.message,
      });
      setEmailTestOpen(false);
    } catch (err: any) {
      toast({
        title: "Email Test Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestWa = async () => {
    setTestingWa(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/settings/test-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumberId: whatsappPhoneNumberId,
          accessToken: whatsappAccessToken,
          testPhone: waTestPhone
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      toast({
        title: "Meta WhatsApp Test Passed ✓",
        description: data.message,
      });
      setWaTestOpen(false);
    } catch (err: any) {
      toast({
        title: "WhatsApp Test Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setTestingWa(false);
    }
  };

  const handleSync = async () => {
    if (offlineQueue.length === 0) {
      toast({ title: "No entries to sync", description: "Offline database is already empty." });
      return;
    }

    if (!isOnline) {
      toast({ title: "Sync failed", description: "You are currently offline. Please check internet connection.", variant: "destructive" });
      return;
    }

    setSyncing(true);
    const token = localStorage.getItem("vision2020_token");
    let successCount = 0;

    for (const entry of offlineQueue) {
      try {
        let remotePath = entry.imagePath;
        if (entry.imagePath.startsWith("data:")) {
          const blob = await fetch(entry.imagePath).then(r => r.blob());
          const file = new File([blob], "sync_photo.jpg", { type: "image/jpeg" });
          const formData = new FormData();
          formData.append("image", file);

          const imgRes = await fetch("/api/patients/upload-image", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          if (imgRes.ok) {
            const data = await imgRes.json();
            remotePath = data.imagePath;
          }
        }

        const res = await fetch("/api/patients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ ...entry, imagePath: remotePath })
        });

        if (res.ok) {
          await offlineDB.deleteEntry(entry.id!);
          successCount++;
        }
      } catch (err) {
        console.error(err);
      }
    }

    setSyncing(false);
    fetchOfflineCount();
    
    if (successCount > 0) {
      toast({ title: "Sync Complete", description: `Successfully uploaded ${successCount} patient entries.`, variant: "default" });
    } else {
      toast({ title: "Sync Failed", description: "Failed to upload offline entries. Try again.", variant: "destructive" });
    }
  };

  const handleClearLocalQueue = async () => {
    if (!window.confirm("WARNING: This will permanently delete all unsaved local drafts on this device. Proceed?")) return;
    try {
      for (const entry of offlineQueue) {
        await offlineDB.deleteEntry(entry.id!);
      }
      setOfflineQueue([]);
      toast({ title: "Cleared", description: "Local queue cleared successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            System & Security Settings
            {isSuperAdmin && (
              <span className="bg-orange-100 text-[#FF6B00] border border-orange-200 text-xs font-black px-2.5 py-0.5 rounded-full uppercase">
                Super Admin Access
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500">
            {isSuperAdmin
              ? "Configure Email SMTP, Official WhatsApp Meta API, and 1st-Time Login Security Policies."
              : "Manage PWA offline device storage and data synchronization."}
          </p>
        </div>

        {isSuperAdmin && (
          <Button
            onClick={() => handleSaveSettings()}
            disabled={savingSettings || loadingSettings}
            className="bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white font-bold h-10 px-5 rounded-xl shadow-sm flex items-center gap-2"
          >
            {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All Settings
          </Button>
        )}
      </div>

      {/* SUPER ADMIN ONLY SETTINGS PANELS */}
      {isSuperAdmin && (
        <div className="space-y-6">
          {/* Card: 1st Time Login & Security Policies */}
          <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#FF6B00]" /> First-Time Login & Security Enforcement Policies
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Configure mandatory 2FA OTP security rules for first logins and password changes.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-800">1st Time Login OTP</p>
                    <p className="text-[11px] text-slate-500">Require OTP verification on initial account activation</p>
                  </div>
                  <Switch
                    checked={requireOtpFirstLogin}
                    onCheckedChange={setRequireOtpFirstLogin}
                    className="data-[state=checked]:bg-[#FF6B00]"
                  />
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-800">Password Change OTP</p>
                    <p className="text-[11px] text-slate-500">Require typing 6-digit OTP before changing password</p>
                  </div>
                  <Switch
                    checked={requireOtpPasswordChange}
                    onCheckedChange={setRequireOtpPasswordChange}
                    className="data-[state=checked]:bg-[#FF6B00]"
                  />
                </div>

                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <Label htmlFor="session-timeout" className="text-xs font-bold text-slate-800">Web Session Expiry (Minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={sessionTimeoutMinutes}
                    onChange={(e) => setSessionTimeoutMinutes(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DEVICE STORAGE & OFFLINE QUEUE (VISIBLE TO ALL USERS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white">
          <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Database className="h-4.5 w-4.5 text-[#FF6B00]" /> Device Storage & Offline Queue
              </CardTitle>
              <CardDescription className="text-xs">Queue management for offline-first screenings.</CardDescription>
            </div>
            {isOnline ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Wifi className="h-3 w-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            )}
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <p className="font-semibold text-slate-700">Queued Offline Patients</p>
                <p className="text-[10px] text-slate-400">Captured records awaiting database upload</p>
              </div>
              <span className="text-xl font-bold text-slate-800">{offlineQueue.length}</span>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSync}
                disabled={syncing || offlineQueue.length === 0}
                className="flex-1 bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white font-bold h-9 text-xs rounded-lg flex items-center justify-center gap-1"
              >
                {syncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sync Offline Data
              </Button>

              <Button 
                onClick={handleClearLocalQueue}
                disabled={offlineQueue.length === 0}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 h-9 text-xs rounded-lg flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" /> Clear Queue
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security / session info */}
        <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white">
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Shield className="h-4.5 w-4.5 text-[#FF6B00]" /> Security & Session Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-3.5 text-xs text-slate-600">
            <p>• <strong>Persistent Mobile Field Sessions</strong>: Mobile app field screeners and ophthalmic officers maintain uninterrupted, persistent login sessions for seamless village camp operations.</p>
            <p>• <strong>2FA OTP Verification</strong>: Password changes and first-time activations require 6-digit OTP verification.</p>
            <p>• <strong>Enterprise Encryption</strong>: All database transactions and transmission channels use high-strength SSL encryption.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
