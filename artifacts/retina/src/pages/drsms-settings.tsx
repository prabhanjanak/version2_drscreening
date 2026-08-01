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
          {/* Card 1: Email SMTP Configuration */}
          <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white overflow-hidden">
            <CardHeader className="py-4 px-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[#FF6B00]" /> Email SMTP Configuration (1st Login & Password OTP)
                </CardTitle>
                <CardDescription className="text-xs text-slate-300">
                  Setup SMTP credentials for automated 6-digit OTP delivery to staff email addresses.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="email-enabled" className="text-xs font-semibold text-slate-200">Email Gateway Status</Label>
                <Switch
                  id="email-enabled"
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                  className="data-[state=checked]:bg-[#FF6B00]"
                />
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-host" className="text-xs font-bold text-slate-700">SMTP Host *</Label>
                  <Input
                    id="smtp-host"
                    placeholder="e.g. smtp.gmail.com or smtp.office365.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="h-10 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-port" className="text-xs font-bold text-slate-700">SMTP Port *</Label>
                  <Input
                    id="smtp-port"
                    placeholder="587 (TLS) or 465 (SSL)"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="h-10 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-user" className="text-xs font-bold text-slate-700">SMTP Username / Email *</Label>
                  <Input
                    id="smtp-user"
                    placeholder="noreply@sankaraeye.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="h-10 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-pass" className="text-xs font-bold text-slate-700">SMTP Password *</Label>
                  <div className="relative">
                    <Input
                      id="smtp-pass"
                      type={showSmtpPass ? "text" : "password"}
                      placeholder="Enter SMTP password or App Password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      className="h-10 text-xs bg-slate-50 focus:bg-white pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp-from-name" className="text-xs font-bold text-slate-700">Sender Name</Label>
                  <Input
                    id="smtp-from-name"
                    placeholder="Sankara DRSMS Security"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    className="h-10 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp-from-email" className="text-xs font-bold text-slate-700">Sender Email</Label>
                  <Input
                    id="smtp-from-email"
                    placeholder="noreply@sankaraeye.com"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    className="h-10 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="smtp-secure"
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.checked)}
                    className="rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                  />
                  <Label htmlFor="smtp-secure" className="text-xs font-medium text-slate-600">
                    Use SSL/TLS Connection (Port 465)
                  </Label>
                </div>

                <Button
                  type="button"
                  onClick={() => setEmailTestOpen(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold h-9 px-4 rounded-lg flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5 text-[#FF6B00]" /> Test Email Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Official WhatsApp Meta Cloud API Configuration */}
          <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white overflow-hidden">
            <CardHeader className="py-4 px-6 bg-gradient-to-r from-emerald-950 to-teal-900 text-white flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-emerald-400" /> Official WhatsApp Meta Cloud API Gateway
                </CardTitle>
                <CardDescription className="text-xs text-slate-300">
                  Connect Meta WhatsApp Business Cloud API (`graph.facebook.com/v20.0`) for instant OTP delivery on WhatsApp.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="wa-enabled" className="text-xs font-semibold text-slate-200">WhatsApp Gateway Status</Label>
                <Switch
                  id="wa-enabled"
                  checked={whatsappEnabled}
                  onCheckedChange={setWhatsappEnabled}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="wa-phone-id" className="text-xs font-bold text-slate-700">Meta Phone Number ID *</Label>
                  <Input
                    id="wa-phone-id"
                    placeholder="e.g. 109823471092834"
                    value={whatsappPhoneNumberId}
                    onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                    className="h-10 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="wa-waba-id" className="text-xs font-bold text-slate-700">WhatsApp Business Account ID (WABA ID)</Label>
                  <Input
                    id="wa-waba-id"
                    placeholder="e.g. 981273918237123"
                    value={whatsappWabaId}
                    onChange={(e) => setWhatsappWabaId(e.target.value)}
                    className="h-10 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="wa-token" className="text-xs font-bold text-slate-700">Meta Permanent System Access Token *</Label>
                  <div className="relative">
                    <Input
                      id="wa-token"
                      type={showWaToken ? "text" : "password"}
                      placeholder="EAAG..."
                      value={whatsappAccessToken}
                      onChange={(e) => setWhatsappAccessToken(e.target.value)}
                      className="h-10 text-xs bg-slate-50 focus:bg-white pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWaToken(!showWaToken)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showWaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="wa-template" className="text-xs font-bold text-slate-700">Approved OTP Template Name</Label>
                  <Input
                    id="wa-template"
                    placeholder="drsms_otp_code"
                    value={whatsappTemplateName}
                    onChange={(e) => setWhatsappTemplateName(e.target.value)}
                    className="h-10 text-xs bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={() => setWaTestOpen(true)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold h-9 px-4 rounded-lg flex items-center gap-1.5"
                >
                  <Smartphone className="h-3.5 w-3.5 text-emerald-600" /> Test Meta WhatsApp Gateway
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: 1st Time Login & Security Policies */}
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
                  <Label htmlFor="session-timeout" className="text-xs font-bold text-slate-800">Session Expiry (Minutes)</Label>
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
            <p>• <strong>Auto Session Invalidation</strong>: Sessions expire after 30 minutes of inactivity to safeguard clinical privacy.</p>
            <p>• <strong>2FA OTP Verification</strong>: Password changes and first-time activations require 6-digit OTP verification.</p>
            <p>• <strong>Enterprise Encryption</strong>: All database transactions and transmission channels use high-strength SSL encryption.</p>
          </CardContent>
        </Card>
      </div>

      {/* TEST EMAIL MODAL */}
      <Dialog open={emailTestOpen} onOpenChange={setEmailTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Mail className="h-5 w-5 text-[#FF6B00]" /> Test Email SMTP Connection
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send a test verification email to confirm SMTP host, port, and credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <Label htmlFor="test-recipient" className="font-bold text-slate-700">Recipient Email Address</Label>
            <Input
              id="test-recipient"
              type="email"
              placeholder="e.g. prabhanjan@sankaraeye.com"
              value={emailTestRecipient}
              onChange={(e) => setEmailTestRecipient(e.target.value)}
              className="h-10 text-xs"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEmailTestOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleTestEmail}
              disabled={testingEmail || !emailTestRecipient}
              className="bg-[#FF6B00] hover:bg-orange-600 text-white font-bold gap-1.5"
            >
              {testingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Test Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TEST WHATSAPP MODAL */}
      <Dialog open={waTestOpen} onOpenChange={setWaTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-800">
              <MessageSquare className="h-5 w-5 text-emerald-600" /> Test Meta WhatsApp Cloud API
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send a test ping message via Graph API (`graph.facebook.com`) to verify credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <Label htmlFor="test-phone" className="font-bold text-slate-700">Recipient Mobile Number (10 Digits or with Country Code)</Label>
            <Input
              id="test-phone"
              placeholder="e.g. 8951568286"
              value={waTestPhone}
              onChange={(e) => setWaTestPhone(e.target.value)}
              className="h-10 text-xs"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setWaTestOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleTestWa}
              disabled={testingWa || !waTestPhone}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              {testingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Test WhatsApp Ping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
