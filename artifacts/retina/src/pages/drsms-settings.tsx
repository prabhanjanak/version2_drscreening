import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Settings, Shield, RefreshCw, Wifi, 
  WifiOff, Database, CheckCircle, Trash2 
} from "lucide-react";
import { offlineDB, OfflineScreeningEntry } from "@/lib/offline-db";

export default function DrsmsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offlineQueue, setOfflineQueue] = useState<OfflineScreeningEntry[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  const fetchOfflineCount = async () => {
    try {
      const entries = await offlineDB.getAllEntries();
      setOfflineQueue(entries);
    } catch (err) {
      console.error("Failed to read offline queue", err);
    }
  };

  useEffect(() => {
    fetchOfflineCount();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
        // Upload photo if base64
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500">Configure PWA offline behaviors and diagnostics settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offline cache card */}
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white">
          <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Database className="h-4.5 w-4.5 text-[#FF6B00]" /> Device Storage & Sync
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
        <Card className="rounded-xl border border-slate-200 shadow-xs bg-white">
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Shield className="h-4.5 w-4.5 text-[#FF6B00]" /> Security & Session Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-3.5 text-xs text-slate-600">
            <p>• **Auto Logout**: Session automatically invalidates after 30 minutes of inactivity to protect clinical privacy.</p>
            <p>• **Local Encryption**: Temporary offline data is saved securely inIndexedDB inside the device's sandbox environment.</p>
            <p>• **Audit Log**: Every screening entry and user login is audited for clinical safety purposes.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
