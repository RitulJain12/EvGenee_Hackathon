import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { BookingsAPI, StationsAPI, type Booking, type Station } from "@/lib/api";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  MapPin,
  Plus,
  Power,
  Zap,
  TrendingUp,
  Calendar,
  IndianRupee,
  Edit2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency, getApiError } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/LocationPicker";

export const Route = createFileRoute("/owner/")({
  component: OwnerPage,
});

function OwnerPage() {
  const { isOwner, loading: authLoading, isAuthed } = useAuth();
  const nav = useNavigate();
  const [stations, setStations] = useState<Station[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [otpFor, setOtpFor] = useState<Booking | null>(null);
  const [otp, setOtp] = useState("");

  // Edit station states
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    operator: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
    lat: "",
    lng: "",
    totalPorts: "",
    availablePorts: "",
    chargingSpeed: "",
    openingHours: "",
    phone: "",
    email: "",
    amenities: "",
    image: "",
    platformFee: "",
  });
  const [editConnectors, setEditConnectors] = useState<{ type: string; price: string }[]>([]);
  const [updating, setUpdating] = useState(false);

  const startEdit = (s: Station) => {
    setEditingStation(s);
    setEditForm({
      name: s.name || "",
      operator: s.operator || "",
      street: s.address?.street || "",
      city: s.address?.city || "",
      state: s.address?.state || "",
      country: s.address?.country || "India",
      postalCode: s.address?.postalCode || "",
      lat: s.location?.coordinates?.[1]?.toString() || "",
      lng: s.location?.coordinates?.[0]?.toString() || "",
      totalPorts: s.totalPorts?.toString() || "",
      availablePorts: s.availablePorts?.toString() || "",
      chargingSpeed: s.chargingSpeed?.toString() || "",
      openingHours: s.openingHours || "",
      phone: s.contactInfo?.phoneNumber || "",
      email: s.contactInfo?.email || "",
      amenities: (s.amenities || []).join(", "),
      image: (s.Images || []).join(", "),
      platformFee: (s.platformFee || 5).toString(),
    });
    setEditConnectors(
      (s.pricing || []).map((p) => ({
        type: p.connectorType,
        price: p.priceperKWh.toString(),
      })),
    );
  };

  const handleUpdate = async () => {
    if (!editingStation) return;
    setUpdating(true);
    try {
      const types = editConnectors.map((c) => c.type);
      await StationsAPI.update(editingStation._id, {
        name: editForm.name,
        operator: editForm.operator,
        location: {
          type: "Point",
          coordinates: [parseFloat(editForm.lng) || 0, parseFloat(editForm.lat) || 0],
        },
        address: {
          street: editForm.street,
          city: editForm.city,
          state: editForm.state,
          country: editForm.country,
          postalCode: editForm.postalCode,
        },
        amenities: editForm.amenities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        totalPorts: Number(editForm.totalPorts),
        availablePorts: Number(editForm.availablePorts),
        chargingSpeed: Number(editForm.chargingSpeed),
        typeOfConnectors: types,
        pricing: editConnectors.map((c) => ({
          connectorType: c.type,
          priceperKWh: Number(c.price),
          currency: "INR" as "INR" | "USD" | "EUR",
          portCount: 1,
        })),
        openingHours: editForm.openingHours,
        contactInfo: { phoneNumber: editForm.phone, email: editForm.email },
        Images: editForm.image
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        platformFee: Number(editForm.platformFee),
      });
      toast.success("Station updated!");
      setEditingStation(null);
      load();
    } catch (e) {
      toast.error(getApiError(e, "Update failed"));
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async (bookingId: string) => {
    setBusyId(bookingId);
    try {
      await BookingsAPI.complete(bookingId);
      toast.success("Session completed!");
      load();
    } catch (e) {
      toast.error(getApiError(e, "Completion failed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleCheckIn = async () => {
    if (!otpFor) return;
    setBusyId(otpFor._id);
    try {
      await BookingsAPI.checkIn(otpFor._id, { otp });
      toast.success("Checked in! Session started.");
      setOtpFor(null);
      setOtp("");
      load();
    } catch (e) {
      toast.error(getApiError(e, "Invalid OTP"));
    } finally {
      setBusyId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await StationsAPI.myStations();
      const list: Station[] = r.data?.data ?? [];
      setStations(list);

      const all: Booking[] = [];
      for (const s of list) {
        try {
          const br = await BookingsAPI.station(s._id, { limit: 50 });
          all.push(...(br.data?.data ?? []));
        } catch {
          /* ignore per station */
        }
      }
      setBookings(all);
    } catch (e) {
      toast.error(getApiError(e, "Failed to load owner data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) load();
  }, [isOwner]);

  useEffect(() => {
    if (stations.length > 0) {
      stations.forEach((s) => socket.emit("station:subscribe", s._id));

      const reload = () => load();
      socket.on("booking:created", reload);
      socket.on("booking:cancelled", reload);
      socket.on("booking:checkedIn", reload);
      socket.on("booking:completed", reload);

      return () => {
        stations.forEach((s) => socket.emit("station:unsubscribe", s._id));
        socket.off("booking:created", reload);
        socket.off("booking:cancelled", reload);
        socket.off("booking:checkedIn", reload);
        socket.off("booking:completed", reload);
      };
    }
  }, [stations.map((s) => s._id).join(",")]);

  const stats = useMemo(() => {
    const revenue = bookings
      .filter((b) => b.status === "completed")
      .reduce((s, b) => s + b.grandTotal, 0);
    const active = bookings.filter((b) => ["confirmed", "in-progress"].includes(b.status)).length;
    const totalKWh = bookings
      .filter((b) => b.status === "completed")
      .reduce((s, b) => s + b.estimatedKWh, 0);

    const byDay: Record<string, number> = {};
    bookings.forEach((b) => {
      const k = format(new Date(b.date), "MMM d");
      byDay[k] = (byDay[k] || 0) + 1;
    });
    const trend = Object.entries(byDay)
      .slice(-7)
      .map(([day, count]) => ({ day, count }));

    const byStatus: Record<string, number> = {};
    bookings.forEach((b) => {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    });
    const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

    return { revenue, active, totalKWh, trend, statusData };
  }, [bookings]);

  if (authLoading)
    return (
      <div className="h-screen grid place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  if (!isAuthed) return <Navigate to="/auth/login" />;
  if (!isOwner)
    return (
      <div className="max-w-md mx-auto p-6 text-center pt-20">
        <h2 className="text-xl font-bold">Owner access only</h2>
        <p className="text-muted-foreground mt-2">
          Sign up as a Station Owner to access this panel.
        </p>
        <Link to="/" className="text-primary font-semibold mt-4 inline-block">
          ← Back to map
        </Link>
      </div>
    );

  const toggle = async (s: Station) => {
    setBusyId(s._id);
    try {
      await StationsAPI.toggle(s._id);
      load();
    } catch (e) {
      toast.error(getApiError(e, "Toggle failed"));
    } finally {
      setBusyId(null);
    }
  };

  const PIE_COLORS = [
    "#C64F38", // terracotta
    "#4A6163", // slate green
    "#0F9F59", // forest green
    "#E2F3EC", // light green
    "#FAF9F6", // light grey bg
  ];

  return (
    <div
      className="max-w-3xl mx-auto p-4 space-y-5 relative min-h-screen pb-20"
      style={{
        fontFamily: "'Inter', sans-serif",
        paddingTop: "calc(var(--safe-top) + 2rem)",
      }}
    >
      {/* Project Texture */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-[#242426] font-space uppercase tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Owner Dashboard</h1>
          <p className="text-xs text-[#4A6163] font-medium">Manage stations & bookings</p>
        </div>
        <Button
          onClick={() => nav({ to: "/owner/new" })}
          className="bg-[#242426] hover:bg-[#343436] text-white font-bold rounded-[4px] text-xs uppercase tracking-wider transition-all font-space shadow-sm flex items-center justify-center h-10 px-4"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Station
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
        <Kpi icon={<MapPin className="h-4 w-4 text-[#C64F38]" />} label="Stations" value={stations.length.toString()} />
        <Kpi icon={<Calendar className="h-4 w-4 text-[#C64F38]" />} label="Active Bookings" value={stats.active.toString()} />
        <Kpi icon={<Zap className="h-4 w-4 text-[#C64F38]" />} label="Total kWh" value={stats.totalKWh.toFixed(0)} />
        <Kpi icon={<IndianRupee className="h-4 w-4 text-[#C64F38]" />} label="Revenue" value={formatCurrency(stats.revenue)} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-3 relative z-10">
        <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-4 shadow-sm">
          <h3 className="font-bold mb-3 text-xs text-[#242426] uppercase tracking-wider font-space flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <TrendingUp className="h-4 w-4 text-[#C64F38]" />
            Bookings (last 7 days)
          </h3>
          <div className="h-44">
            <ResponsiveContainer>
              <BarChart data={stats.trend}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: "Space Grotesk" }} stroke="#4A6163" />
                <YAxis tick={{ fontSize: 10, fontFamily: "Space Grotesk" }} stroke="#4A6163" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#C64F38" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-4 shadow-sm">
          <h3 className="font-bold mb-3 text-xs text-[#242426] uppercase tracking-wider font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Booking status</h3>
          <div className="h-44">
            {stats.statusData.length === 0 ? (
              <div className="grid place-items-center h-full text-xs text-[#4A6163]/50">
                No data
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={55}
                    label={{ fontSize: 10, fontFamily: "Space Grotesk" }}
                  >
                    {stats.statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: "Space Grotesk" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Stations list */}
      <div className="space-y-3 relative z-10">
        <h2 className="font-bold text-[#242426] uppercase tracking-wider text-xs font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Your Stations</h2>
        {loading ? (
          <div className="py-12 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#C64F38]" />
          </div>
        ) : stations.length === 0 ? (
          <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-8 text-center shadow-sm">
            <Zap className="h-12 w-12 mx-auto text-[#4A6163]/20 mb-3" />
            <p className="font-bold text-sm text-[#242426] uppercase tracking-wider font-space">No stations yet</p>
            <p className="text-xs text-[#4A6163] mt-1">
              Add your first charging station to get started.
            </p>
          </div>
        ) : (
          stations.map((s) => (
            <div
              key={s._id}
              className="bg-white border border-[#D1D1D1] rounded-[4px] p-4 shadow-sm flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-[4px] bg-[#FBE8E4] border border-[#FBDED9] grid place-items-center text-[#C64F38] shrink-0">
                <Zap className="h-5 w-5" fill="currentColor" />
              </div>
              <Link
                to="/owner/stations/$stationId"
                params={{ stationId: s._id }}
                className="flex-1 min-w-0 hover:opacity-85 transition-opacity"
              >
                <p className="font-bold text-[#242426] text-sm truncate">{s.name}</p>
                <p className="text-xs text-[#4A6163] truncate">
                  {s.address.city} · {s.availablePorts}/{s.totalPorts} ports · {s.openingHours}
                </p>
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startEdit(s)}
                  className="text-[#4A6163] hover:text-[#C64F38] hover:bg-[#FAF9F6] rounded-[4px] h-8 w-8"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Switch
                  checked={s.isOpen}
                  disabled={busyId === s._id}
                  onCheckedChange={() => toggle(s)}
                  className="data-[state=checked]:bg-[#0F9F59] data-[state=unchecked]:bg-[#D1D1D1]"
                />
                <Power
                  className={`h-4 w-4 ${s.isOpen ? "text-[#0F9F59]" : "text-[#4A6163]/40"}`}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Station Modal */}
      <Dialog open={!!editingStation} onOpenChange={(o) => !o && setEditingStation(null)}>
        <DialogContent className="max-w-[500px] max-h-[85vh] overflow-y-auto rounded-[4px] bg-white border border-[#D1D1D1] text-[#242426]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#242426] uppercase tracking-wider font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Edit Station</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-3">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-[#C64F38] uppercase tracking-wider font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Basic Info</h3>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Operator</Label>
                <Input
                  value={editForm.operator}
                  onChange={(e) => setEditForm({ ...editForm, operator: e.target.value })}
                  className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Image URLs (comma separated)</Label>
                <Input
                  value={editForm.image}
                  onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                  className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                />
              </div>
            </div>

            {/* Location & Map */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-[#C64F38] uppercase tracking-wider font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Location</h3>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Street</Label>
                <Input
                  value={editForm.street}
                  onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                  className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">City</Label>
                  <Input
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">State</Label>
                  <Input
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Postal Code</Label>
                  <Input
                    value={editForm.postalCode}
                    onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Country</Label>
                  <Input
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                  />
                </div>
              </div>
              <div className="pt-2">
                <Label className="text-[10px] font-bold text-[#4A6163] block mb-2 uppercase tracking-wider font-space">Pin on Map</Label>
                <LocationPicker
                  lat={parseFloat(editForm.lat) || 0}
                  lng={parseFloat(editForm.lng) || 0}
                  onChange={(lat, lng) =>
                    setEditForm((f) => ({ ...f, lat: lat.toString(), lng: lng.toString() }))
                  }
                />
              </div>
            </div>

            {/* Capacity & Pricing */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-[#C64F38] uppercase tracking-wider font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Capacity & Pricing</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Speed (kW)</Label>
                  <Input
                    type="number"
                    value={editForm.chargingSpeed}
                    onChange={(e) => setEditForm({ ...editForm, chargingSpeed: e.target.value })}
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Total Ports</Label>
                  <Input
                    type="number"
                    value={editForm.totalPorts}
                    onChange={(e) => setEditForm({ ...editForm, totalPorts: e.target.value })}
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Available</Label>
                  <Input
                    type="number"
                    value={editForm.availablePorts}
                    onChange={(e) => setEditForm({ ...editForm, availablePorts: e.target.value })}
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Platform Fee (%)</Label>
                <Input
                  type="number"
                  value={editForm.platformFee}
                  onChange={(e) => setEditForm({ ...editForm, platformFee: e.target.value })}
                  className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                />
              </div>

              <div>
                <Label className="text-[10px] font-bold text-[#4A6163] block mb-2 uppercase tracking-wider font-space">Connectors</Label>
                {editConnectors.map((c, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select
                      className="flex-1 bg-[#FAF9F6] border border-[#D1D1D1] text-[#242426] text-xs h-10 rounded-[4px] px-3 focus:outline-none focus:border-[#C64F38]"
                      value={c.type}
                      onChange={(e) =>
                        setEditConnectors(
                          editConnectors.map((x, idx) =>
                            idx === i ? { ...x, type: e.target.value } : x,
                          ),
                        )
                      }
                    >
                      {["CCS2", "CHAdeMO", "Type2", "Type1", "Tesla"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <Input
                      className="flex-1 bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                      type="number"
                      placeholder="Price/kWh"
                      value={c.price}
                      onChange={(e) =>
                        setEditConnectors(
                          editConnectors.map((x, idx) =>
                            idx === i ? { ...x, price: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setEditConnectors(editConnectors.filter((_, idx) => idx !== i))
                      }
                      className="text-[#4A6163] hover:text-[#C64F38] h-10 w-10 hover:bg-[#FAF9F6] rounded-[4px]"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditConnectors([...editConnectors, { type: "Type2", price: "10" }])
                  }
                  className="border-[#D1D1D1] text-[#4A6163] hover:bg-[#FAF9F6] rounded-[4px] text-[10px] uppercase font-bold tracking-wider font-space h-9"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add connector
                </Button>
              </div>
            </div>

            {/* Contact & Misc */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-[#C64F38] uppercase tracking-wider font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Contact & Misc</h3>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Opening Hours</Label>
                <Input
                  value={editForm.openingHours}
                  onChange={(e) => setEditForm({ ...editForm, openingHours: e.target.value })}
                  className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Phone</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Email</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Amenities (comma separated)</Label>
                <Input
                  value={editForm.amenities}
                  onChange={(e) => setEditForm({ ...editForm, amenities: e.target.value })}
                  className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] rounded-[4px] h-10 text-sm focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sticky bottom-0 bg-white py-2 border-t border-[#EAEAEA] mt-4">
            <Button
              variant="outline"
              onClick={() => setEditingStation(null)}
              className="border-[#D1D1D1] text-[#4A6163] hover:bg-[#FAF9F6] rounded-[4px] text-xs uppercase tracking-wider font-space"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updating}
              className="bg-[#242426] hover:bg-[#343436] text-white font-bold rounded-[4px] text-xs uppercase tracking-wider transition-all font-space shadow-sm"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP Dialog for Check-in */}
      <Dialog open={!!otpFor} onOpenChange={(o) => !o && setOtpFor(null)}>
        <DialogContent className="bg-white border border-[#D1D1D1] text-[#242426] rounded-[4px] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#242426] uppercase tracking-wider font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Verify Check-in OTP</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#4A6163]">
            Enter the 6-digit OTP provided by the user to start the session.
          </p>
          <Input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            placeholder="000000"
            className="text-center text-xl tracking-[0.5em] font-mono h-12 bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
          />
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOtpFor(null)}
              className="border-[#D1D1D1] text-[#4A6163] hover:bg-[#FAF9F6] rounded-[4px] text-xs uppercase tracking-wider font-space"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={otp.length !== 6 || busyId === otpFor?._id}
              className="bg-[#C64F38] hover:bg-[#B53F29] text-white font-bold rounded-[4px] text-xs uppercase tracking-wider transition-all font-space shadow-sm h-10 px-4"
            >
              {busyId === otpFor?._id ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                "Verify & Start"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">{label}</Label>
      {children}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-3 shadow-sm">
      <div className="h-9 w-9 rounded-[4px] bg-[#FAF9F6] border border-[#D1D1D1] grid place-items-center text-[#C64F38] mb-2">
        {icon}
      </div>
      <p className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space">{label}</p>
      <p className="font-bold text-lg text-[#242426] truncate font-space">{value}</p>
    </div>
  );
}
