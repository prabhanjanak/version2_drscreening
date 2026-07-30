import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, Edit2, Trash2, Key, MapPin, 
  ShieldAlert, CheckCircle, RefreshCw, Plus, X 
} from "lucide-react";

interface SystemUser {
  id: number;
  empId: string;
  name: string;
  email: string | null;
  mobile: string | null;
  userType: string;
  status: string;
  assignedPlace: string | null;
  createdAt: string;
}

export default function DrsmsUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [pwdResetModalOpen, setPwdResetModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [pwdResetUser, setPwdResetUser] = useState<SystemUser | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [empId, setEmpId] = useState(""); // Username
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("field_user");
  const [status, setStatus] = useState("active");
  const [assignedPlace, setAssignedPlace] = useState("");
  const [saving, setSaving] = useState(false);

  const openResetPasswordModal = (user: SystemUser) => {
    setPwdResetUser(user);
    setNewPassword("");
    setPwdResetModalOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdResetUser || !newPassword) {
      toast({ title: "Validation Error", description: "Please enter a new password.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/system-users/${pwdResetUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to reset password");
      }
      toast({ 
        title: "Password Changed! 🔑", 
        description: `Password for ${pwdResetUser.name} (${pwdResetUser.empId}) changed successfully.` 
      });
      setPwdResetModalOpen(false);
      setNewPassword("");
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/system-users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaces = async () => {
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch("/api/screening-places", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlaces(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPlaces();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setName("");
    setEmpId("");
    setPassword("");
    setMobile("");
    setEmail("");
    setRole("field_user");
    setStatus("active");
    setAssignedPlace("");
    setModalOpen(true);
  };

  const openEditModal = (user: SystemUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmpId(user.empId);
    setPassword("");
    setMobile(user.mobile || "");
    setEmail(user.email || "");
    setRole(user.userType);
    setStatus(user.status || "active");
    setAssignedPlace(user.assignedPlace || "");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !empId || (!editingUser && !password)) {
      toast({ title: "Validation Error", description: "Name, Username and Password are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("vision2020_token");
      const isEdit = !!editingUser;
      const url = isEdit ? `/api/system-users/${editingUser.id}` : "/api/system-users";
      const method = isEdit ? "PATCH" : "POST";

      const payload: Record<string, any> = {
        name,
        empId,
        userType: role,
        status,
        mobile: mobile || undefined,
        email: email || undefined,
        assignedPlace: assignedPlace || null
      };

      if (password) {
        payload.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save user");
      }

      toast({ title: "Success", description: `User ${isEdit ? "updated" : "created"} successfully` });
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const token = localStorage.getItem("vision2020_token");
      const res = await fetch(`/api/system-users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete user");
      toast({ title: "Deleted", description: "User deleted successfully" });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto bg-slate-50/50 pb-20 md:pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">Configure roles, passwords, and assigned screening locations.</p>
        </div>
        {currentUser?.userType === "super_admin" && (
          <Button onClick={openCreateModal} className="bg-gradient-to-r from-orange-500 to-[#FF6B00] text-white hover:from-[#FF6B00] hover:to-orange-600 text-xs font-semibold px-4 h-8 rounded-lg shadow-sm">
            <Plus className="h-4 w-4 mr-1" /> Add User
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="rounded-xl border border-slate-200/80 p-8 text-center flex flex-col items-center gap-2">
          <Users className="h-10 w-10 text-slate-300" />
          <h3 className="font-bold text-slate-700">No Users Configured</h3>
          <p className="text-xs text-slate-400">Add field screening and medical users here.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <Card key={u.id} className="rounded-xl border border-slate-200/80 shadow-xs bg-white overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col justify-between h-40">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm truncate max-w-[180px]">{u.name}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Username: {u.empId}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-orange-100 text-[#FF6B00] font-mono text-[9px] font-bold rounded">
                      {u.userType.toUpperCase().replace("_", " ")}
                    </span>
                  </div>
                  
                  <div className="mt-3 text-xs text-slate-500 space-y-1">
                    {u.mobile && <p>Phone: <span className="font-mono">{u.mobile}</span></p>}
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>Place: <span className="font-semibold">{u.assignedPlace || "All Locations"}</span></span>
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    u.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}>
                    {u.status || "active"}
                  </span>
                  
                  {currentUser?.userType === "super_admin" && (
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => openResetPasswordModal(u)}
                        title="Change / Reset User Password"
                        className="p-1.5 bg-amber-50 border border-amber-200 rounded-md text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        <Key className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => openEditModal(u)}
                        title="Edit User Details"
                        className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        title="Delete User"
                        disabled={u.empId === "010177"} // Prevent deleting root superadmin
                        className="p-1.5 bg-white border border-slate-200 rounded-md text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CRUD Modal dialog overlay */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200">
            <CardHeader className="flex flex-row justify-between items-center py-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold">{editingUser ? "Edit" : "Create"} User Account</CardTitle>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="p-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Saurabh Rai"
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Username / Emp ID</label>
                    <input
                      type="text"
                      disabled={!!editingUser}
                      value={empId}
                      onChange={(e) => setEmpId(e.target.value)}
                      placeholder="e.g. 010188"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUser ? "Leave blank to keep same" : "e.g. Password@123"}
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="10 digit number"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@sankaraeye.com"
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white"
                    >
                      <option value="field_user">Field User / Screener</option>
                      <option value="asha_worker">ASHA Worker</option>
                      <option value="vision_center">Vision Center Officer</option>
                      <option value="facility_manager">Facility Manager (Logistics)</option>
                      <option value="admin_unit">Admin (Unit Level)</option>
                      <option value="unit_head">Unit Head</option>
                      <option value="doctor">Doctor</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Assign Screening Place</label>
                  <select
                    value={assignedPlace}
                    onChange={(e) => setAssignedPlace(e.target.value)}
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg bg-white"
                  >
                    <option value="">All places / Admin</option>
                    {places.map(p => (
                      <option key={p.id} value={p.shortCode}>{p.name} ({p.shortCode})</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" onClick={() => setModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 h-8 text-xs rounded-lg">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-[#FF6B00] hover:bg-[#E05E00] text-white h-8 text-xs rounded-lg px-4 flex items-center gap-1 font-semibold">
                    {saving && <RefreshCw className="h-3 w-3 animate-spin" />}
                    Save User
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
      {/* Dedicated Change Password Modal for Super Admin */}
      {pwdResetModalOpen && pwdResetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <CardHeader className="flex flex-row justify-between items-center py-4 border-b border-slate-100 bg-amber-50/50">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Key className="h-4.5 w-4.5 text-amber-600" /> Change User Password
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Target Account: <strong>{pwdResetUser.name}</strong> ({pwdResetUser.empId})
                </CardDescription>
              </div>
              <button onClick={() => setPwdResetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <form onSubmit={handleResetPassword}>
              <CardContent className="p-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">New Password *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (e.g. Sankara@123)"
                    className="w-full text-xs border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#FF6B00] outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Setting password here allows immediate login without forcing password change.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setPwdResetModalOpen(false)} className="h-8 text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-[#FF6B00] hover:bg-orange-600 text-white h-8 text-xs font-bold px-4">
                    {saving ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
