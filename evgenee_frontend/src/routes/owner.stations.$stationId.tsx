import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { BookingsAPI, StationsAPI, type Booking, type Station } from "@/lib/api";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MapPin,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Calendar,
  Zap,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency, getApiError } from "@/lib/utils";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/owner/stations/$stationId")({
  component: StationOwnerDashboard,
});

function StationOwnerDashboard() {
  const { stationId } = Route.useParams();
  const { isOwner, loading: authLoading, isAuthed } = useAuth();
  const nav = useNavigate();

  const [station, setStation] = useState<Station | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [otpFor, setOtpFor] = useState<Booking | null>(null);
  const [otp, setOtp] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "mechanic">("bookings");
  const [dispatchStatus, setDispatchStatus] = useState<"pending" | "en_route" | "arrived" | "completed">("en_route");

  const load = async () => {
    setLoading(true);
    try {
      const sr = await StationsAPI.details(stationId);
      setStation(sr.data?.data);
      const br = await BookingsAPI.station(stationId, { limit: 100 });
      setBookings(br.data?.data ?? []);
    } catch (e) {
      toast.error(getApiError(e, "Failed to load station data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      load();
      socket.emit("station:subscribe", stationId);
      const reload = () => load();
      socket.on("booking:created", reload);
      socket.on("booking:cancelled", reload);
      socket.on("booking:checkedIn", reload);
      socket.on("booking:completed", reload);
      return () => {
        socket.emit("station:unsubscribe", stationId);
        socket.off("booking:created", reload);
        socket.off("booking:cancelled", reload);
        socket.off("booking:checkedIn", reload);
        socket.off("booking:completed", reload);
      };
    }
  }, [isOwner, stationId]);

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

  const stats = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const inProgress = bookings.filter((b) => b.status === "in-progress").length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const revenue = bookings
      .filter((b) => b.status === "completed")
      .reduce((s, b) => s + b.grandTotal, 0);
    return { confirmed, inProgress, completed, revenue };
  }, [bookings]);

  if (authLoading)
    return (
      <div className="h-screen grid place-items-center bg-[#000814]">
        <Loader2 className="h-7 w-7 animate-spin text-green-400" />
      </div>
    );
  if (!isAuthed) return <Navigate to="/auth/login" />;
  if (!isOwner) return <Navigate to="/" />;

  return (
    <div
      className="min-h-screen bg-[#FAF9F6] text-[#242426] relative"
      style={{
        paddingBottom: "5.5rem",
        fontFamily: "'Inter', sans-serif",
        paddingTop: "calc(var(--safe-top, 0px) + 2rem)",
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

      <div className="relative z-10 max-w-2xl mx-auto px-4">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => nav({ to: "/owner" })}
            className="h-9 w-9 rounded-[4px] bg-white border border-[#D1D1D1] flex items-center justify-center hover:bg-[#FAF9F6] transition-colors shrink-0 text-[#4A6163]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1
              className="text-xl font-bold text-[#242426] leading-tight font-space uppercase tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {station?.name || "Station Dashboard"}
            </h1>
            {station && (
              <p className="text-xs text-[#4A6163] flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="h-3 w-3 shrink-0 text-[#C64F38]" />
                {station.address.city}, {station.address.street}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-24 grid place-items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-[4px] border-2 border-[#D1D1D1] border-t-[#C64F38] animate-spin" />
                <Zap className="h-5 w-5 text-[#C64F38] absolute inset-0 m-auto" />
              </div>
              <p className="text-[#4A6163]/60 text-xs uppercase font-bold tracking-wider font-space">Loading bookings…</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Stats Strip ── */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { label: "Confirmed", value: stats.confirmed, color: "text-[#C64F38]", bg: "bg-white border-[#D1D1D1]" },
                { label: "Active", value: stats.inProgress, color: "text-[#0066CC]", bg: "bg-[#FAF9F6] border-[#D1D1D1]" },
                { label: "Done", value: stats.completed, color: "text-[#242426]", bg: "bg-white border-[#D1D1D1]" },
                { label: "Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}`, color: "text-[#0F9F59]", bg: "bg-white border-[#D1D1D1]" },
              ].map(({ label, value, color, bg }) => (
                <div
                  key={label}
                  className={cn("rounded-[4px] p-2.5 border text-center shadow-sm", bg)}
                >
                  <p className={cn("font-bold text-base leading-none mb-1 font-space", color)} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {value}
                  </p>
                  <p className="text-[#4A6163] text-[9px] font-bold uppercase tracking-wider font-space">{label}</p>
                </div>
              ))}
            </div>

            {/* ── Tab Selector ── */}
            <div className="flex border-b border-[#D1D1D1] mb-5 relative z-10">
              <button
                onClick={() => setActiveTab("bookings")}
                className={cn(
                  "px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider font-space border-b-2 transition-all duration-200 outline-none",
                  activeTab === "bookings"
                    ? "border-[#C64F38] text-[#242426]"
                    : "border-transparent text-[#4A6163]/60 hover:text-[#242426]"
                )}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                📅 Live Bookings
              </button>
              <button
                onClick={() => setActiveTab("mechanic")}
                className={cn(
                  "px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider font-space border-b-2 transition-all duration-200 outline-none flex items-center gap-1.5",
                  activeTab === "mechanic"
                    ? "border-[#C64F38] text-[#242426]"
                    : "border-transparent text-[#4A6163]/60 hover:text-[#242426]"
                )}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                🛠️ Rescue Tracker
                <span className="h-1.5 w-1.5 rounded-full bg-[#C64F38] animate-ping" />
              </button>
            </div>

            {activeTab === "bookings" && (
              /* ── Bookings List ── */
              <div className="bg-white border border-[#D1D1D1] rounded-[4px] overflow-hidden shadow-sm relative z-10 animate-in fade-in duration-200">
                {/* List header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#D1D1D1]">
                  <span className="text-xs font-bold text-[#242426] uppercase tracking-wider font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Bookings</span>
                  <span className="text-[9px] bg-[#FAF9F6] px-2.5 py-0.5 rounded-[4px] text-[#4A6163] uppercase tracking-wider font-bold border border-[#D1D1D1]">
                    Latest {bookings.length}
                  </span>
                </div>

                {bookings.length === 0 ? (
                  <div className="text-center py-14">
                    <div className="h-12 w-12 rounded-[4px] bg-[#FAF9F6] border border-[#D1D1D1] flex items-center justify-center mx-auto mb-3">
                      <Calendar className="h-6 w-6 text-[#4A6163]/20" />
                    </div>
                    <p className="text-[#4A6163]/60 text-sm font-medium">No bookings yet</p>
                    <p className="text-[#4A6163]/40 text-xs mt-1">Bookings will appear here in real-time</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#D1D1D1]">
                    {bookings.map((b) => {
                      const userName =
                        b.user && typeof b.user === "object" && "name" in b.user
                          ? (b.user as { name: string }).name
                          : typeof b.user === "string"
                          ? "User"
                          : "Unknown";

                      const isConfirmed = b.status === "confirmed";
                      const isInProgress = b.status === "in-progress";
                      const isCompleted = b.status === "completed";
                      const isCancelled = b.status === "cancelled";

                      return (
                        <div
                          key={b._id}
                          className="px-4 py-3.5 hover:bg-[#FAF9F6] transition-colors"
                        >
                          {/* Row 1: name + badge */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 rounded-[4px] bg-[#FAF9F6] border border-[#D1D1D1] flex items-center justify-center shrink-0">
                                <User className="h-3.5 w-3.5 text-[#4A6163]" />
                              </div>
                              <span className="font-bold text-[#242426] text-sm truncate">
                                {userName}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "text-[9px] px-2 py-0.5 rounded-[4px] font-bold uppercase tracking-wider shrink-0 font-space",
                                isConfirmed && "bg-[#FAF9F6] text-[#C64F38] border border-[#D1D1D1]",
                                isInProgress && "bg-[#EAF5FF] text-[#0066CC] border border-[#B8DFFF]",
                                isCompleted && "bg-[#FAF9F6] text-[#242426]/60 border border-[#D1D1D1]",
                                isCancelled && "bg-[#FFF0F0] text-[#D32F2F] border border-[#FFD2D2]",
                                !isConfirmed && !isInProgress && !isCompleted && !isCancelled &&
                                  "bg-[#FAF9F6] text-[#4A6163] border border-[#D1D1D1]",
                              )}
                            >
                              {b.status}
                            </span>
                          </div>

                          {/* Row 2: date/time + connector */}
                          <div className="flex items-center gap-3 mb-2 pl-9">
                            <span className="text-xs text-[#4A6163] flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-[#4A6163]/50 shrink-0" />
                              {format(new Date(b.date), "MMM d, yyyy")} · {b.startTime}–{b.endTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pl-9 mb-2.5">
                            <span className="text-[9px] text-[#4A6163]/70 bg-[#FAF9F6] px-1.5 py-0.5 border border-[#D1D1D1] rounded-[2px] font-bold tracking-wider font-space">
                              {b.connectorType}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-[#4A6163]/20" />
                            <span className="text-[9px] text-[#4A6163]/70 bg-[#FAF9F6] px-1.5 py-0.5 border border-[#D1D1D1] rounded-[2px] font-bold tracking-wider font-space">
                              {b.estimatedKWh} kWh
                            </span>
                          </div>

                          {/* Row 3: amount + action */}
                          <div className="flex items-center justify-between pl-9">
                            <span className="font-bold text-[#C64F38] text-sm font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                              {formatCurrency(b.grandTotal)}
                            </span>
                            <div className="flex gap-2">
                              {isConfirmed && (
                                <button
                                  onClick={() => setOtpFor(b)}
                                  className="h-8 px-4 rounded-[4px] bg-[#242426] hover:bg-[#343436] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all font-space"
                                >
                                  <KeyRound className="h-3 w-3" />
                                  Check-in
                                </button>
                              )}
                              {isInProgress && (
                                <button
                                  onClick={() => handleComplete(b._id)}
                                  disabled={busyId === b._id}
                                  className="h-8 px-4 rounded-[4px] bg-[#242426] hover:bg-[#343436] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all font-space disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {busyId === b._id ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3 w-3" />
                                      Complete
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "mechanic" && (
              <div className="space-y-4 relative z-10 animate-in fade-in duration-200">
                {/* Mechanic Staff Details */}
                <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3 pb-2 border-b border-[#EAEAEA]">
                    <div>
                      <span className="text-[9px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Assigned Station Crew</span>
                      <h3 className="font-bold text-sm text-[#242426] uppercase font-space mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {station?.mechanic?.name || "Senior Tech Julian Vance"}
                      </h3>
                    </div>
                    <span className="text-[9px] bg-[#E0EAEB] border border-[#C6DCDD] text-[#192829] px-2 py-0.5 rounded-[4px] font-bold tracking-wider font-space uppercase">
                      ON DUTY
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[#4A6163] text-[9px] font-bold uppercase tracking-wider font-space">Speciality</p>
                      <p className="font-medium text-[#242426] mt-0.5">{station?.mechanic?.speciality || "High-Voltage Battery & Roadside SOS"}</p>
                    </div>
                    <div>
                      <p className="text-[#4A6163] text-[9px] font-bold uppercase tracking-wider font-space">Contact Helpline</p>
                      <p className="font-medium text-[#242426] mt-0.5">{station?.mechanic?.phone || "+91-9876543210"}</p>
                    </div>
                  </div>
                </div>

                {/* Dispatch Tracker timeline */}
                <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-5 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#EAEAEA]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-[#C64F38] animate-pulse" />
                      <span className="text-xs font-bold text-[#242426] uppercase font-space tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Live Dispatch Timeline
                      </span>
                    </div>
                    
                    {/* Status Controls */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Stage:</span>
                      <button
                        onClick={() => {
                          const stages: ("pending" | "en_route" | "arrived" | "completed")[] = ["pending", "en_route", "arrived", "completed"];
                          const idx = stages.indexOf(dispatchStatus);
                          setDispatchStatus(stages[(idx + 1) % stages.length]);
                        }}
                        className="text-[9px] bg-[#FAF9F6] border border-[#D1D1D1] px-2 py-1 rounded-[4px] text-[#242426] hover:bg-[#EAEAEA] font-bold uppercase tracking-wider font-space"
                      >
                        {dispatchStatus.replace("_", " ")} ↻
                      </button>
                    </div>
                  </div>

                  {/* Active target profile */}
                  <div className="bg-[#FAF9F6] border border-[#D1D1D1] rounded-[4px] p-3 mb-5 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-[#242426] text-xs font-space uppercase">Lucid Air Pure (5% CRITICAL)</h4>
                      <p className="text-[10px] text-[#4A6163] mt-0.5">SOS Beacon triggered near HWY 101, Milepost 42</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#C64F38] font-bold text-xs font-space uppercase">
                        {dispatchStatus === "completed" ? "RESOLVED" : "ETA 12 MINS"}
                      </p>
                      <p className="text-[9px] text-[#4A6163] uppercase tracking-wider font-space">Rescue Transit</p>
                    </div>
                  </div>

                  {/* Timeline Tree */}
                  <div className="relative border-l border-[#D1D1D1] pl-5 ml-2.5 space-y-5 py-1">
                    {/* Timeline Node 1 */}
                    <div className="relative">
                      <div className="absolute -left-[25px] top-0.5 h-2.5 w-2.5 rounded-full bg-[#242426] border-2 border-white" />
                      <div className="flex justify-between items-start text-xs">
                        <div>
                          <p className="font-bold text-[#242426]">Crisis Protocol Initiated</p>
                          <p className="text-[#4A6163] text-[10px] mt-0.5">Emergency SOS beacon verified by control center.</p>
                        </div>
                        <span className="text-[9px] text-[#4A6163] font-mono font-bold">09:41 AM</span>
                      </div>
                    </div>

                    {/* Timeline Node 2 */}
                    {["en_route", "arrived", "completed"].includes(dispatchStatus) && (
                      <div className="relative animate-in fade-in duration-300">
                        <div className={`absolute -left-[25px] top-0.5 h-2.5 w-2.5 rounded-full ${dispatchStatus === "en_route" ? "bg-[#C64F38] ring-4 ring-[#C64F38]/20" : "bg-[#242426]"} border-2 border-white`} />
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <p className="font-bold text-[#242426]">Mechanic Assigned & In Transit</p>
                            <p className="text-[#4A6163] text-[10px] mt-0.5">
                              Unit Alpha-01 ({station?.mechanic?.name || "Julian Vance"}) dispatched with mobile rapid chargers.
                            </p>
                          </div>
                          <span className="text-[9px] text-[#4A6163] font-mono font-bold">09:43 AM</span>
                        </div>
                      </div>
                    )}

                    {/* Timeline Node 3 */}
                    {["arrived", "completed"].includes(dispatchStatus) && (
                      <div className="relative animate-in fade-in duration-300">
                        <div className={`absolute -left-[25px] top-0.5 h-2.5 w-2.5 rounded-full ${dispatchStatus === "arrived" ? "bg-[#C64F38] ring-4 ring-[#C64F38]/20" : "bg-[#242426]"} border-2 border-white`} />
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <p className="font-bold text-[#242426]">Arrived On-Site</p>
                            <p className="text-[#4A6163] text-[10px] mt-0.5">Rapid EV rescue unit established diagnostic bridge and high-voltage line connections.</p>
                          </div>
                          <span className="text-[9px] text-[#4A6163] font-mono font-bold">10:05 AM</span>
                        </div>
                      </div>
                    )}

                    {/* Timeline Node 4 */}
                    {dispatchStatus === "completed" && (
                      <div className="relative animate-in fade-in duration-300">
                        <div className="absolute -left-[25px] top-0.5 h-2.5 w-2.5 rounded-full bg-[#4A6163] ring-4 ring-[#4A6163]/20 border-2 border-white" />
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <p className="font-bold text-[#242426]">Rescue Mission Completed</p>
                            <p className="text-[#4A6163] text-[10px] mt-0.5">Delivered 15 kWh emergency charge. Vehicle cleared for transit back to base terminal.</p>
                          </div>
                          <span className="text-[9px] text-[#4A6163] font-mono font-bold">10:25 AM</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── OTP Dialog ── */}
      <Dialog open={!!otpFor} onOpenChange={(o) => !o && setOtpFor(null)}>
        <DialogContent className="bg-white border border-[#D1D1D1] text-[#242426] rounded-[4px] max-w-sm mx-auto shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[#242426] font-bold uppercase font-space tracking-tight text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Verify Check-in OTP</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#4A6163]">
            Enter the 6-digit OTP provided by the customer.
          </p>
          <Input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/20 rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38]"
          />
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              variant="outline"
              onClick={() => { setOtpFor(null); setOtp(""); }}
              className="border-[#D1D1D1] text-[#4A6163] hover:bg-[#FAF9F6] rounded-[4px] flex-1 font-space uppercase text-[10px] font-bold h-10 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={otp.length !== 6 || busyId === otpFor?._id}
              className="bg-[#242426] hover:bg-[#343436] text-white font-bold rounded-[4px] flex-1 font-space uppercase text-[10px] h-10 transition-colors"
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
