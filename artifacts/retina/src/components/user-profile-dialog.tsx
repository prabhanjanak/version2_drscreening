import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Phone, User, Lock, Building, CheckCircle2, MessageSquare } from "lucide-react";

interface UserProfileDialogProps {
  open: boolean;
  onClose: () => void;
  user: any;
  token: string | null;
}

export function UserProfileDialog({ open, onClose, user, token }: UserProfileDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Profile details state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [institution, setInstitution] = useState("");
  const [saving, setSaving] = useState(false);

  // Password Reset state
  const [resetEmail, setResetEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);



  // Sync details from prop when opened
  useEffect(() => {
    if (open && user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setMobile(user.mobile || "");
      setInstitution(user.institution || "");
      setResetEmail(user.email || "");
      setOtpSent(false);
      setOtp("");
      setNewPassword("");
      setCountdown(0);
    }
  }, [open, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const resp = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, mobile, institution }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update profile");
      }

      toast({
        title: "Profile Updated ✓",
        description: "Your basic details have been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendOtp = async () => {
    if (!resetEmail.trim()) {
      toast({ title: "Please enter your email address", variant: "destructive" });
      return;
    }

    setSendingOtp(true);
    try {
      const resp = await fetch("/api/auth/profile/reset-password-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send verification code");
      }

      const res = await resp.json();
      setOtpSent(true);
      setCountdown(60); // 60 second resend timer
      toast({
        title: "OTP Dispatched ✓",
        description: res.message || "Check your email and WhatsApp for the 6-digit OTP.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to send OTP",
        description: err.message || "Make sure SMTP or WhatsApp settings are configured.",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      toast({ title: "Please enter the complete 6-digit OTP code", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setVerifyingOtp(true);
    try {
      const resp = await fetch("/api/auth/profile/reset-password-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: otp.trim(), newPassword }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Verification failed");
      }

      toast({
        title: "Password Updated ✓",
        description: "Your password has been successfully verified and updated.",
      });
      setOtpSent(false);
      setOtp("");
      setNewPassword("");
      onClose();
    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: err.message || "Invalid or expired OTP code.",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const isParticipant = user?.userType === "participant";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-gradient-to-r from-slate-900 via-[#FF6B00] to-slate-900 px-6 py-5 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-sm shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg font-bold">My Account & Security Profile</DialogTitle>
              <DialogDescription className="text-white/85 text-xs mt-0.5">
                Update account info and change password with OTP verification
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Form 1: Edit profile details */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#FF6B00]" /> Personal Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name" className="text-xs font-semibold text-slate-700">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 text-sm focus-visible:ring-[#FF6B00]"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-mobile" className="text-xs font-semibold text-slate-700">Mobile Number (WhatsApp Enabled)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    id="profile-mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="pl-9 text-sm focus-visible:ring-[#FF6B00]"
                    placeholder="Enter 10-digit mobile number"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-email" className="text-xs font-semibold text-slate-700">Email Address (SMTP OTP)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-sm focus-visible:ring-[#FF6B00]"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              {isParticipant && (
                <div className="space-y-1.5">
                  <Label htmlFor="profile-inst" className="text-xs font-semibold text-slate-700">Institution</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      id="profile-inst"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="pl-9 text-sm focus-visible:ring-[#FF6B00]"
                      placeholder="Enter hospital/institution"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-orange-500 to-[#FF6B00] hover:from-[#FF6B00] hover:to-orange-600 text-white text-xs font-bold px-4 h-9 shadow-xs"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Save Information
              </Button>
            </div>
          </form>

          {/* Form 2: Password Reset flow with Mandatory OTP */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#FF6B00]" /> Change Security Password (OTP Required)
            </h3>

            {!otpSent ? (
              <div className="space-y-4 bg-orange-50/50 p-4 rounded-2xl border border-orange-200">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Before changing your account password, security policy requires typing a 6-digit verification OTP. The OTP code will be sent to your registered email and WhatsApp.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="reset-email" className="text-xs font-bold text-slate-800">Target Verification Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <Input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-9 text-sm bg-white focus-visible:ring-[#FF6B00]"
                        placeholder="user@sankaraeye.com"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="bg-[#FF6B00] hover:bg-orange-600 text-white text-xs font-bold h-10 shadow-xs gap-1.5"
                  >
                    {sendingOtp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                    Send Verification OTP
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50/30 border border-orange-200 rounded-2xl p-4 space-y-4 shadow-xs">
                <div className="flex items-start gap-2.5 text-xs text-orange-900">
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5 text-[#FF6B00]" />
                  <div>
                    <span className="font-bold">Verification code dispatched!</span> Enter the 6-digit OTP code sent to <span className="font-mono text-[#FF6B00] font-bold">{resetEmail}</span> / registered mobile.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-otp" className="text-xs font-bold text-slate-800">Enter 6-Digit Security OTP *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <Input
                        id="reset-otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.trim())}
                        maxLength={6}
                        className="pl-9 text-sm font-mono font-bold tracking-widest bg-white focus-visible:ring-[#FF6B00]"
                        placeholder="123456"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reset-password" className="text-xs font-bold text-slate-800">New Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <Input
                        id="reset-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-9 text-sm bg-white focus-visible:ring-[#FF6B00]"
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-orange-100">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 h-8 px-2"
                    >
                      Edit Email
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || countdown > 0}
                      className="text-xs text-[#FF6B00] hover:text-orange-700 h-8 px-2 font-bold"
                    >
                      {countdown > 0 ? `Resend OTP (${countdown}s)` : "Resend OTP"}
                    </Button>
                  </div>

                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otp.length !== 6 || newPassword.length < 6}
                    className="bg-[#FF6B00] hover:bg-orange-600 text-white text-xs font-bold px-4 h-9 shadow-xs"
                  >
                    {verifyingOtp && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Verify OTP & Update Password
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
