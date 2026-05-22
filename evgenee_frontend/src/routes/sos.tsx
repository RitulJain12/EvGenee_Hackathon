import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { RoadsideAPI, type SosRequest, type IssueType, type MechanicInfo, StationsAPI, type Station } from "@/lib/api";
import { toast } from "sonner";
import { getApiError } from "@/lib/utils";
import {
  AlertTriangle,
  MapPin,
  Phone,
  Clock,
  Star,
  ChevronRight,
  X,
  CheckCircle2,
  Loader2,
  Navigation,
  Wrench,
  Truck,
  History,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/sos")({
  component: SosPage,
});

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: "Pending",          color: "text-amber-700",   bg: "bg-[#FCF5E3] border-[#F2E4C2]" },
  mechanic_assigned: { label: "Mechanic Assigned", color: "text-[#4A6163]", bg: "bg-[#E0EAEB] border-[#CADADB]" },
  tow_dispatched:    { label: "Tow Dispatched",    color: "text-[#C64F38]",    bg: "bg-[#FBE8E4] border-[#F7D8D1]" },
  en_route:          { label: "En Route",          color: "text-[#4A6163]",    bg: "bg-[#E0EAEB] border-[#CADADB]" },
  resolved:          { label: "Resolved",          color: "text-[#242426]",    bg: "bg-[#F5F5F5] border-[#EAEAEA]" },
  cancelled:         { label: "Cancelled",         color: "text-[#B54A3E]",     bg: "bg-[#FDF2F0] border-[#FBDED9]" },
};

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return <div className="h-5 w-5 border-2 border-[#C64F38] border-t-transparent rounded-full animate-spin" />;
}

function Bg() {
  return (
    <>
      <div className="fixed inset-0 z-0 bg-[#FAF9F6]" />
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
    </>
  );
}

// ── Mechanic Card ─────────────────────────────────────────────────────────────
function MechanicCard({ mechanic, isTow }: { mechanic: MechanicInfo; isTow: boolean }) {
  return (
    <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`h-12 w-12 rounded-[4px] flex items-center justify-center border ${isTow ? "bg-[#FBE8E4] border-[#F7D8D1]" : "bg-[#E0EAEB] border-[#CADADB]"}`}>
          {isTow ? <Truck className="h-6 w-6 text-[#C64F38]" /> : <Wrench className="h-6 w-6 text-[#4A6163]" />}
        </div>
        <div>
          <p className="font-bold text-[#242426] text-base font-space uppercase tracking-wider">{mechanic.name}</p>
          <p className="text-xs text-[#4A6163]">{mechanic.garage}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          <span className="text-sm font-bold text-[#242426]">{mechanic.rating}</span>
        </div>
      </div>
      <p className="text-xs text-[#4A6163] italic">{mechanic.speciality}</p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Clock className="h-4 w-4 text-[#C64F38]" />, label: "ETA", val: mechanic.estimatedArrival },
          { icon: <MapPin className="h-4 w-4 text-[#4A6163]" />, label: "Distance", val: mechanic.distance },
          { icon: <Phone className="h-4 w-4 text-[#4A6163]" />, label: "Phone", val: mechanic.phone },
        ].map((item) => (
          <div key={item.label} className="bg-[#FAF9F6] rounded-[4px] p-3 border border-[#EAEAEA] text-center">
            <div className="flex justify-center mb-1">{item.icon}</div>
            <p className="text-[9px] text-[#4A6163] uppercase tracking-widest font-bold font-space">{item.label}</p>
            <p className="text-xs font-bold text-[#242426] mt-0.5 truncate">{item.val}</p>
          </div>
        ))}
      </div>
      <a
        href={`tel:${mechanic.phone}`}
        className="flex items-center justify-center gap-2 w-full h-11 bg-[#C64F38] text-white font-bold text-sm rounded-[4px] transition-colors hover:bg-[#242426] font-space uppercase tracking-widest"
      >
        <Phone className="h-4 w-4" /> Call Mechanic
      </a>
    </div>
  );
}

// ── History Card ──────────────────────────────────────────────────────────────
function HistoryCard({ req, onCancel }: { req: SosRequest; onCancel: (id: string) => void }) {
  const s = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
  const canCancel = req.status !== "resolved" && req.status !== "cancelled";
  return (
    <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-5 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-[#242426] text-sm font-space">{req.issueLabel}</p>
          <p className="text-xs text-[#4A6163] mt-0.5">{req.address}</p>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-[4px] border ${s.bg} ${s.color}`}>
          {s.label}
        </span>
      </div>
      {req.mechanic && (
        <div className="bg-[#FAF9F6] rounded-[4px] p-3 border border-[#EAEAEA] flex items-center gap-3">
          <Wrench className="h-4 w-4 text-[#4A6163] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#242426] truncate">{req.mechanic.name}</p>
            <p className="text-[10px] text-[#4A6163]">{req.mechanic.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#4A6163]">ETA</p>
            <p className="text-xs font-bold text-[#C64F38]">{req.mechanic.estimatedArrival}</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-[10px] text-[#4A6163]">
        <span>{new Date(req.createdAt).toLocaleString()}</span>
        {canCancel && (
          <button
            onClick={() => onCancel(req.requestId)}
            className="text-[#C64F38] hover:text-[#242426] transition-colors font-bold uppercase tracking-widest font-space text-[10px]"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function SosPage() {
  const { isAuthed, loading: authLoading, user } = useAuth();

  // Form state
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<string>("");
  const [description, setDescription] = useState("");
  const [requestTow, setRequestTow] = useState(false);

  // Location state
  const [locating, setLocating] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");

  // Preview mechanic
  const [previewMechanic, setPreviewMechanic] = useState<MechanicInfo | null>(null);
  const [nearbyStations, setNearbyStations] = useState<Station[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [activeSos, setActiveSos] = useState<SosRequest | null>(null);

  // History
  const [tab, setTab] = useState<"new" | "history">("new");
  const [history, setHistory] = useState<SosRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load issue types on mount
  useEffect(() => {
    RoadsideAPI.getIssueTypes().then((r) => setIssueTypes(r.data.data)).catch(() => {});
  }, []);

  // When issue = unknown, auto check tow
  useEffect(() => {
    if (selectedIssue === "unknown") setRequestTow(true);
    else setRequestTow(false);
  }, [selectedIssue]);

  // Fetch preview mechanic whenever location is set
  const fetchPreview = useCallback(async (latitude: number, longitude: number) => {
    setPreviewLoading(true);
    try {
      const [mechRes, stRes] = await Promise.allSettled([
        RoadsideAPI.getNearestMechanic({ lat: latitude, lng: longitude }),
        StationsAPI.nearby({ lat: latitude, lng: longitude, maxDistance: 50000 })
      ]);
      if (mechRes.status === "fulfilled") setPreviewMechanic(mechRes.value.data.data);
      if (stRes.status === "fulfilled") setNearbyStations(stRes.value.data.data.slice(0, 3));
    } catch {
      // silent
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setLocating(false);
        fetchPreview(latitude, longitude);
      },
      (err) => {
        toast.error("Could not get location: " + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submitSos = async () => {
    if (!lat || !lng) { toast.error("Please share your location first"); return; }
    if (!selectedIssue) { toast.error("Please select the issue type"); return; }

    setSubmitting(true);
    try {
      const r = await RoadsideAPI.createSos({
        latitude: lat,
        longitude: lng,
        address: address || undefined,
        issueType: selectedIssue,
        description: description || undefined,
        requestTow,
      });
      setActiveSos(r.data.data);
      toast.success(r.data.message);
    } catch (e) {
      toast.error(getApiError(e, "Failed to dispatch help"));
    } finally {
      setSubmitting(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const r = await RoadsideAPI.myRequests();
      setHistory(r.data.data);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      await RoadsideAPI.cancel(requestId);
      toast.success("SOS request cancelled");
      loadHistory();
      if (activeSos?.requestId === requestId) setActiveSos(null);
    } catch (e) {
      toast.error(getApiError(e, "Cancel failed"));
    }
  };

  const resetForm = () => {
    setActiveSos(null);
    setSelectedIssue("");
    setDescription("");
    setRequestTow(false);
    setLat(null);
    setLng(null);
    setAddress("");
    setPreviewMechanic(null);
  };

  if (authLoading) {
    return (
      <div className="h-screen grid place-items-center bg-[#FAF9F6]">
        <div className="h-8 w-8 border-2 border-[#C64F38] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthed) return <Navigate to="/auth/login" />;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#242426] overflow-x-hidden" style={{ paddingBottom: "6rem", fontFamily: "'Inter', sans-serif" }}>
      <Bg />

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-[4px] bg-[#FBE8E4] border border-[#FBDED9] flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-[#C64F38]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#242426] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Roadside SOS
              </h1>
              <p className="text-[#4A6163] text-xs">Emergency mechanic dispatch</p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white border border-[#D1D1D1] rounded-[4px] p-1">
          {(["new", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === "history") loadHistory(); }}
              className={`flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-widest transition-all font-space ${
                tab === t ? "bg-[#C64F38] text-white" : "text-[#4A6163] hover:text-[#242426]"
              }`}
            >
              {t === "new" ? "New SOS" : "History"}
            </button>
          ))}
        </div>

        {/* ── NEW SOS TAB ─────────────────────────────── */}
        {tab === "new" && (
          <>
            {/* Active SOS result */}
            {activeSos ? (
              <div className="space-y-5">
                <div className="bg-[#E0EAEB] border border-[#CADADB] rounded-[4px] p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="h-6 w-6 text-[#4A6163]" />
                    <div>
                      <p className="font-bold text-[#242426] text-base font-space uppercase tracking-wider">Help Dispatched!</p>
                      <p className="text-xs text-[#4A6163]">{activeSos.issueLabel}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#4A6163] mb-1">📍 {activeSos.address}</p>
                  <p className="text-[10px] text-[#4A6163]/60">ID: {activeSos.requestId}</p>
                </div>

                {activeSos.mechanic && (
                  <MechanicCard mechanic={activeSos.mechanic} isTow={activeSos.towRequested} />
                )}

                <div className="flex gap-3">
                  <button
                    onClick={resetForm}
                    className="flex-1 h-12 rounded-[4px] bg-white border border-[#D1D1D1] text-[#242426] font-bold text-sm hover:bg-[#F5F5F5] transition-colors font-space uppercase tracking-widest"
                  >
                    New SOS
                  </button>
                  <button
                    onClick={() => cancelRequest(activeSos.requestId)}
                    className="flex-1 h-12 rounded-[4px] bg-[#FBE8E4] border border-[#FBDED9] text-[#C64F38] font-bold text-sm hover:bg-[#FDF2F0] transition-colors font-space uppercase tracking-widest"
                  >
                    Cancel Request
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Location */}
                <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-5 shadow-sm">
                  <p className="text-xs font-bold text-[#4A6163] uppercase tracking-widest mb-3 font-space">1. Your Location</p>
                  {lat && lng ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-[4px] bg-[#E0EAEB] border border-[#CADADB] flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-[#4A6163]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#4A6163] font-space uppercase tracking-wider">Location Acquired</p>
                        <p className="text-xs text-[#4A6163] truncate">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
                      </div>
                      <button onClick={getLocation} className="h-8 w-8 rounded-[4px] bg-[#FAF9F6] border border-[#D1D1D1] flex items-center justify-center hover:bg-[#F5F5F5] transition-colors">
                        <RefreshCw className="h-3.5 w-3.5 text-[#4A6163]" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={getLocation}
                      disabled={locating}
                      className="w-full h-12 flex items-center justify-center gap-2 rounded-[4px] bg-[#242426] border border-[#242426] text-white font-bold text-sm hover:bg-[#4A6163] transition-colors disabled:opacity-50 font-space uppercase tracking-widest"
                    >
                      {locating ? <Spinner /> : <Navigation className="h-4 w-4" />}
                      {locating ? "Getting Location…" : "Share My Location"}
                    </button>
                  )}
                </div>

                {/* Issue type */}
                <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-5 shadow-sm">
                  <p className="text-xs font-bold text-[#4A6163] uppercase tracking-widest mb-3 font-space">2. What's the Problem?</p>
                  <div className="space-y-2">
                    {issueTypes.length === 0 ? (
                      <div className="py-4 flex justify-center"><Spinner /></div>
                    ) : (
                      issueTypes.map((issue) => {
                        const isSelected = selectedIssue === issue.value;
                        const isTow = issue.value === "unknown";
                        return (
                          <button
                            key={issue.value}
                            onClick={() => setSelectedIssue(issue.value)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-[4px] border transition-all text-left ${
                              isSelected
                                ? isTow
                                  ? "bg-[#FBE8E4] border-[#C64F38] text-[#C64F38]"
                                  : "bg-[#FBE8E4] border-[#C64F38] text-[#C64F38]"
                                : "bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] hover:bg-[#F5F5F5]"
                            }`}
                          >
                            <span className="text-sm font-semibold">{issue.label}</span>
                            {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#C64F38]" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-5 shadow-sm">
                  <p className="text-xs font-bold text-[#4A6163] uppercase tracking-widest mb-3 font-space">3. Additional Details (Optional)</p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what happened…"
                    rows={3}
                    className="w-full bg-[#FAF9F6] border border-[#D1D1D1] rounded-[4px] px-4 py-3 text-sm text-[#242426] placeholder:text-[#4A6163]/50 resize-none focus:outline-none focus:border-[#242426] transition-colors"
                  />
                </div>

                {/* Preview mechanic */}
                {previewLoading && (
                  <div className="flex items-center gap-3 py-3 px-4 bg-white border border-[#D1D1D1] rounded-[4px] shadow-sm">
                    <Spinner />
                    <p className="text-sm text-[#4A6163]">Finding nearest mechanic…</p>
                  </div>
                )}
                {previewMechanic && !previewLoading && (
                  <div>
                    <p className="text-xs font-bold text-[#4A6163] uppercase tracking-widest mb-3 px-1 font-space">Nearest Mechanic Preview</p>
                    <MechanicCard mechanic={previewMechanic} isTow={selectedIssue === "unknown"} />
                  </div>
                )}

                {nearbyStations.length > 0 && !previewLoading && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-[#4A6163] uppercase tracking-widest px-1 font-space">Or Contact a Nearby Station</p>
                    <div className="flex overflow-x-auto pb-2 gap-3 snap-x hide-scrollbar">
                      {nearbyStations.map((st) => (
                        <div key={st._id} className="min-w-[280px] bg-white border border-[#D1D1D1] rounded-[4px] p-4 snap-center shrink-0 shadow-sm">
                          <p className="font-bold text-sm text-[#242426] truncate mb-1 font-space">{st.name}</p>
                          <p className="text-[10px] text-[#4A6163] mb-3">{st.distanceKm} km away</p>
                          {st.mechanic && st.mechanic.name ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-[4px] bg-[#E0EAEB] border border-[#CADADB] flex items-center justify-center shrink-0">
                                  <Wrench className="h-4 w-4 text-[#4A6163]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-[#242426] truncate">{st.mechanic.name}</p>
                                  <p className="text-[10px] text-[#4A6163] truncate">{st.mechanic.speciality}</p>
                                </div>
                              </div>
                              <a href={`tel:${st.mechanic.phone}`} className="flex items-center justify-center gap-2 w-full h-10 bg-[#FAF9F6] border border-[#D1D1D1] rounded-[4px] text-[#242426] font-bold text-xs hover:bg-[#F5F5F5] transition-colors font-space uppercase tracking-widest">
                                <Phone className="h-3.5 w-3.5" /> Call {st.mechanic.phone}
                              </a>
                            </div>
                          ) : (
                            <p className="text-[10px] text-[#4A6163] italic">No mechanic available</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SOS Button */}
                <button
                  onClick={submitSos}
                  disabled={submitting || !lat || !selectedIssue}
                  className="w-full h-16 rounded-[4px] font-bold text-base tracking-widest font-space uppercase flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                  style={{
                    background: submitting || !lat || !selectedIssue
                      ? "#C7C6CA"
                      : "#C64F38",
                    border: "none",
                  }}
                >
                  {submitting ? (
                    <><Spinner /> Dispatching Help…</>
                  ) : (
                    <><AlertTriangle className="h-6 w-6" /> SOS — Send Help Now</>
                  )}
                </button>

                <p className="text-center text-[10px] text-[#4A6163] px-4">
                  Tapping SOS will immediately dispatch a mechanic and send a confirmation email to {user?.email}
                </p>
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ─────────────────────────────── */}
        {tab === "history" && (
          <div className="space-y-4">
            {historyLoading ? (
              <div className="py-20 flex justify-center">
                <div className="h-8 w-8 border-2 border-[#C64F38] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-[#D1D1D1] rounded-[4px] bg-white shadow-sm">
                <History className="h-10 w-10 text-[#4A6163]/40 mx-auto mb-3" />
                <p className="text-[#4A6163]/60 text-sm font-bold uppercase tracking-widest font-space">No SOS requests yet</p>
              </div>
            ) : (
              history.map((req) => (
                <HistoryCard key={req.requestId} req={req} onCancel={cancelRequest} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
