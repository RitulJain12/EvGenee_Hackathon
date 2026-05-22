import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AuthAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  LogOut,
  Mail,
  Shield,
  User,
  Zap,
  Car,
  Plug,
  CheckCircle2,
  Plus,
  X,
  Settings2,
  Pencil,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { getApiError } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

type SavedVehicle = {
  nickname: string;
  type: string;
  connectorType: string;
  batteryCapacity?: number;
  vehicleNumber?: string;
};

function ProfilePage() {
  const { user, loading, isAuthed, logout, refresh } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
  });
  
  const [savedVehicles, setSavedVehicles] = useState<SavedVehicle[]>([]);
  const [newVehicle, setNewVehicle] = useState<SavedVehicle>({
    nickname: "",
    type: "EV",
    connectorType: "CCS2",
    batteryCapacity: undefined,
    vehicleNumber: ""
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingVehicle, setProcessingVehicle] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? "",
      });
      setSavedVehicles((user as any).savedVehicles ?? []);
    }
  }, [user]);

  if (loading)
    return (
      <div className="h-screen grid place-items-center bg-[#FAF9F6]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-[#242426] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  if (!isAuthed || !user) return <Navigate to="/auth/login" />;

  const addVehicle = async () => {
    if (!newVehicle.nickname) {
      toast.error("Nickname is required");
      return;
    }
    
    setProcessingVehicle(true);
    const updatedFleet = [...savedVehicles, newVehicle];
    
    try {
      await AuthAPI.updateProfile({
        savedVehicles: updatedFleet as any,
      });
      setSavedVehicles(updatedFleet);
      await refresh();
      setNewVehicle({
        nickname: "",
        type: "EV",
        connectorType: "CCS2",
        batteryCapacity: undefined,
        vehicleNumber: ""
      });
      setShowAddForm(false);
      toast.success("Vehicle registered successfully");
    } catch (e) {
      toast.error(getApiError(e, "Failed to register vehicle"));
    } finally {
      setProcessingVehicle(false);
    }
  };

  const removeVehicle = async (index: number) => {
    setProcessingVehicle(true);
    const updatedFleet = savedVehicles.filter((_, i) => i !== index);
    
    try {
      await AuthAPI.updateProfile({
        savedVehicles: updatedFleet as any,
      });
      setSavedVehicles(updatedFleet);
      await refresh();
      toast.success("Vehicle removed");
    } catch (e) {
      toast.error(getApiError(e, "Failed to remove vehicle"));
    } finally {
      setProcessingVehicle(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await AuthAPI.updateProfile({
        name: form.name,
        savedVehicles: savedVehicles as any,
      });
      await refresh();
      toast.success("Profile saved");
    } catch (e) {
      toast.error(getApiError(e, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    nav({ to: "/auth/login" });
  };

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="min-h-screen bg-[#FAF9F6] text-[#242426] overflow-x-hidden"
      style={{ paddingBottom: "6.5rem", fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="relative z-10 max-w-lg mx-auto px-4"
        style={{ paddingTop: "calc(var(--safe-top, 0px) + 2rem)" }}
      >
        {/* ── Hero Header ── */}
        <div className="relative bg-white border border-[#D1D1D1] rounded-[4px] mb-5 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="h-[72px] w-[72px] rounded-[4px] bg-[#4A6163] flex items-center justify-center text-2xl font-bold text-white shadow-sm font-space uppercase">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-[#C64F38] rounded-full border-2 border-white flex items-center justify-center">
                <div className="h-1.5 w-1.5 bg-white rounded-full" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[#242426] font-space uppercase tracking-wide leading-tight truncate">
                {user.name}
              </h1>
              <p className="text-[#4A6163] text-xs flex items-center gap-1.5 mt-1 truncate font-medium">
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#4A6163]" />
                {user.email}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="inline-flex items-center gap-1 bg-[#FAF9F6] border border-[#D1D1D1] rounded-[4px] px-2.5 py-0.5 text-[#242426] text-[10px] font-bold uppercase tracking-wider font-space">
                  <Shield className="h-3 w-3 text-[#4A6163]" />
                  {user.role}
                </span>
                <span className="inline-flex items-center gap-1 bg-[#FBE8E4] border border-[#FBDED9] rounded-[4px] px-2.5 py-0.5 text-[#C64F38] text-[10px] font-bold uppercase tracking-wider font-space">
                  <CheckCircle2 className="h-3 w-3 text-[#C64F38]" />
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Fleet Size", value: savedVehicles.length.toString(), icon: Car },
              {
                label: "Connectors",
                value: Array.from(new Set(savedVehicles.map(v => v.connectorType))).join(', ') || "—",
                icon: Plug,
              },
              { label: "Status", value: "Active", icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-[#FAF9F6] border border-[#EAEAEA] rounded-[4px] p-2.5 text-center">
                <Icon className="h-3.5 w-3.5 text-[#4A6163] mx-auto mb-1" />
                <p className="text-[#242426] font-bold text-[11px] leading-tight mb-0.5 truncate px-1 font-space uppercase">{value}</p>
                <p className="text-[#4A6163] text-[9px] font-bold uppercase tracking-wider font-space">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Fleet Management ── */}
        <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-6 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-[4px] bg-[#EAEAEA] border border-[#D1D1D1] flex items-center justify-center">
                <Car className="h-3.5 w-3.5 text-[#4A6163]" />
              </div>
              <span className="text-sm font-bold text-[#242426] font-space uppercase tracking-wider">My Fleet</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddForm(!showAddForm)}
              className="h-8 rounded-[4px] bg-[#FBE8E4] text-[#C64F38] border border-[#FBDED9] hover:bg-[#FBDED9] font-space uppercase tracking-wider text-xs"
            >
              {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showAddForm ? "Cancel" : "Add Car"}
            </Button>
          </div>

          {showAddForm && (
            <div className="bg-[#FAF9F6] border border-[#D1D1D1] rounded-[4px] p-4 mb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Nickname</Label>
                  <Input
                    placeholder="e.g. My Nexon"
                    value={newVehicle.nickname}
                    onChange={(e) => setNewVehicle({ ...newVehicle, nickname: e.target.value })}
                    className="bg-white border-[#D1D1D1] text-[#242426] focus:border-[#C64F38] focus:ring-[#C64F38] h-10 text-sm rounded-[4px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Reg. Number</Label>
                  <Input
                    placeholder="MH 01..."
                    value={newVehicle.vehicleNumber}
                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicleNumber: e.target.value.toUpperCase() })}
                    className="bg-white border-[#D1D1D1] text-[#242426] focus:border-[#C64F38] focus:ring-[#C64F38] h-10 text-sm font-mono rounded-[4px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Type</Label>
                  <Select value={newVehicle.type} onValueChange={(v) => setNewVehicle({ ...newVehicle, type: v })}>
                    <SelectTrigger className="bg-white border-[#D1D1D1] text-[#242426] focus:border-[#C64F38] focus:ring-[#C64F38] h-10 text-sm rounded-[4px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-[#D1D1D1] text-[#242426] rounded-[4px]">
                      {["EV", "Hybrid", "Petrol", "Diesel"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Connector</Label>
                  <Select value={newVehicle.connectorType} onValueChange={(v) => setNewVehicle({ ...newVehicle, connectorType: v })}>
                    <SelectTrigger className="bg-white border-[#D1D1D1] text-[#242426] focus:border-[#C64F38] focus:ring-[#C64F38] h-10 text-sm rounded-[4px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-[#D1D1D1] text-[#242426] rounded-[4px]">
                      {["CCS2", "CHAdeMO", "Type2"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={addVehicle} 
                disabled={processingVehicle}
                className="w-full h-10 bg-[#C64F38] hover:bg-[#B53F29] text-white font-bold rounded-[4px] font-space uppercase tracking-wider"
              >
                {processingVehicle ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register Car"}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {savedVehicles.map((v, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#FAF9F6] border border-[#EAEAEA] rounded-[4px] p-3 group">
                <Car className="h-4 w-4 text-[#4A6163]" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#242426] leading-none">{v.nickname}</p>
                  <p className="text-[9px] text-[#4A6163] mt-1 font-bold uppercase tracking-wider font-space">{v.type} · {v.connectorType} · {v.vehicleNumber || 'N/A'}</p>
                </div>
                <button 
                  disabled={processingVehicle}
                  onClick={() => removeVehicle(i)} 
                  className="text-[#4A6163]/40 hover:text-[#C64F38] transition-colors disabled:opacity-30"
                >
                  {processingVehicle ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
            {savedVehicles.length === 0 && !showAddForm && <p className="text-center py-4 text-xs text-[#4A6163]/40 font-space uppercase tracking-wider">Fleet is empty</p>}
          </div>
        </div>

        {/* ── Profile Settings ── */}
        <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-6 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-[4px] bg-[#EAEAEA] border border-[#D1D1D1] flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-[#4A6163]" />
            </div>
            <span className="text-sm font-bold text-[#242426] font-space uppercase tracking-wider">Profile Settings</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Full Name</Label>
              <div className="relative">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-white border-[#D1D1D1] text-[#242426] focus:border-[#C64F38] focus:ring-[#C64F38] h-11 text-sm rounded-[4px] pr-10"
                />
                <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4A6163]/40" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Triggers ── */}
        <div className="space-y-3">
          <button
            onClick={save}
            disabled={saving}
            className="w-full h-12 bg-[#242426] hover:bg-[#343436] text-white font-bold text-sm rounded-[4px] transition-all font-space uppercase tracking-wider shadow-sm active:scale-[0.98] disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save Changes"}
          </button>

          <button
            onClick={handleLogout}
            className="w-full h-12 rounded-[4px] font-bold text-sm text-[#C64F38] border border-[#C64F38] hover:bg-[#FBE8E4] transition-colors font-space uppercase tracking-wider"
          >
            <LogOut className="h-4 w-4 inline mr-2" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
