import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { BookingsAPI, StationsAPI, PaymentAPI, type Station } from "@/lib/api";
import { socket } from "@/lib/socket";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  Star,
  Zap,
  Navigation,
  Send,
  LayoutDashboard,
  // ── NEW: icons for availability card ──
  CheckCircle2,
  XCircle,
  PlugZap,
  Clock,
  Car,
  Hash,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency, getApiError, isStationOpenNow } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/stations/$stationId")({
  component: StationDetail,
});

type Slot = { startTime: string; endTime: string; isAvailable: boolean; availableUnits: number; totalUnits: number };

// ─── IST-aware helpers ───────────────────────────────────────────────────────
function getISTMinutes(): number {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return ist.getHours() * 60 + ist.getMinutes();
}

function getISTDateString(): string {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return format(ist, "yyyy-MM-dd");
}

function isSlotExpired(slot: Slot, selectedDate: string): boolean {
  const todayIST = getISTDateString();
  if (selectedDate !== todayIST) return false;
  const [h, m] = slot.startTime.split(":").map(Number);
  return h * 60 + m <= getISTMinutes();
}

// ─── Peak pricing helper ─────────────────────────────────────────────────────
function isSlotInPeakHours(
  slotTime: string,
  peakPricing: { startTime: string; endTime: string; multiplier: number }[] | undefined,
): { isPeak: boolean; multiplier: number } {
  if (!peakPricing?.length) return { isPeak: false, multiplier: 1 };
  const [h, m] = slotTime.split(":").map(Number);
  const slotMins = h * 60 + m;
  for (const peak of peakPricing) {
    const [ph, pm] = peak.startTime.split(":").map(Number);
    const [eh, em] = peak.endTime.split(":").map(Number);
    if (slotMins >= ph * 60 + pm && slotMins < eh * 60 + em) {
      return { isPeak: true, multiplier: peak.multiplier };
    }
  }
  return { isPeak: false, multiplier: 1 };
}

// ─── NEW: Charger Availability Card ─────────────────────────────────────────
/**
 * Shows total machines vs currently available for the selected connector type.
 * `available` is derived from the nearest non-expired slot's availablePorts,
 * which is refreshed via socket on every booking (availability:updated event).
 */
function ChargerAvailabilityCard({
  connector,
  totalMachines,
  slots,
  date,
  selectedSlot,
}: {
  connector: string;
  totalMachines: number;
  slots: Slot[];
  date: string;
  selectedSlot: Slot | null;
}) {
  // True if at least one slot today is not yet expired
  const hasUpcomingSlots = slots.some((s) => !isSlotExpired(s, date));
  const nearestAvailable = slots.find((s) => s.isAvailable && !isSlotExpired(s, date));
  const available = selectedSlot
    ? selectedSlot.availableUnits
    : (nearestAvailable?.availableUnits ?? 0);

  const totalUnits = totalMachines || 1;
  const pct = totalUnits > 0 ? (available / totalUnits) * 100 : 0;

  const noSlots = !hasUpcomingSlots;
  const statusColor = noSlots ? "text-[#4A6163]/50" : available === 0 ? "text-[#C64F38]" : pct <= 30 ? "text-[#F39C12]" : "text-[#0F9F59]";
  const barColor   = noSlots ? "bg-[#D1D1D1]"   : available === 0 ? "bg-[#C64F38]"   : pct <= 30 ? "bg-[#F39C12]"   : "bg-[#0F9F59]";
  const badgeLabel = noSlots ? "No Slots Today" : available === 0 ? "All Occupied" : `${available} Free`;
  const badgeClass = noSlots
    ? "bg-[#FAF9F6] text-[#4A6163] border border-[#D1D1D1]"
    : available === 0
    ? "bg-[#FBE8E4] text-[#C64F38] border border-[#FBDED9]"
    : pct <= 30
    ? "bg-[#FDF3E3] text-[#F39C12] border border-[#FCE6CF]"
    : "bg-[#E2F3EC] text-[#0F9F59] border border-[#CDECE0]";

  return (
    <div className="rounded-[4px] border border-[#D1D1D1] bg-white p-5 shadow-sm space-y-4">
      {/* Header — plain text, no icon that looks like a machine pill */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider flex items-center gap-1.5 font-space">
          <PlugZap className="h-3.5 w-3.5 text-[#4A6163]" />
          {connector} · {totalUnits} {totalUnits === 1 ? "Machine" : "Machines"}
        </span>
        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-[4px] font-space uppercase", badgeClass)}>
          {badgeLabel}
        </span>
      </div>

      {/* One labelled pill per machine — clearly shows Machine 1, Machine 2… */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: totalUnits }).map((_, i) => {
          const isFree = !noSlots && i < available;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border text-[10px] font-bold transition-all font-space uppercase tracking-wider",
                noSlots
                  ? "bg-[#FAF9F6] border-[#D1D1D1] text-[#4A6163]/50"
                  : isFree
                  ? "bg-[#E2F3EC] border-[#CDECE0] text-[#0F9F59] shadow-sm animate-in fade-in zoom-in duration-300"
                  : "bg-[#FBE8E4] border-[#FBDED9] text-[#C64F38] opacity-60",
              )}
            >
              {isFree ? (
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0F9F59] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0F9F59]"></span>
                </div>
              ) : (
                <Zap className="h-3 w-3 shrink-0" />
              )}
              Machine {i + 1}
              <span className="text-[9px] font-normal opacity-70 ml-0.5">
                {noSlots ? "—" : isFree ? "Free" : "Busy"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar + summary line */}
      <div className="space-y-1.5">
        <div className="h-1.5 w-full bg-[#FAF9F6] border border-[#EAEAEA] rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: noSlots ? "0%" : `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider font-space">
          <span className={cn("font-bold", statusColor)}>
            {noSlots
              ? "No upcoming slots for today"
              : `${available} of ${totalUnits} available`}
          </span>
          {selectedSlot && !noSlots && (
            <span className="text-[#4A6163]">for slot {selectedSlot.startTime}</span>
          )}
        </div>
      </div>
    </div>
  );
}
// ─── END: Charger Availability Card ─────────────────────────────────────────

function StationDetail() {
  const { stationId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [connector, setConnector] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [endTime, setEndTime] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [booking, setBooking] = useState(false);

  // Ticker to re-evaluate expired slots every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (user?.vehicleNumbers?.length && !vehicleNumber) {
      setVehicleNumber(user.vehicleNumbers[0]);
    }
  }, [user, vehicleNumber]);

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const submitReview = async () => {
    if (!reviewComment.trim()) return;
    setReviewing(true);
    try {
      await StationsAPI.review(stationId, {
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success("Review added!");
      setReviewComment("");
      setReviewRating(5);
      const r = await StationsAPI.details(stationId);
      setStation(r.data?.data);
    } catch (e) {
      toast.error(getApiError(e, "Failed to add review"));
    } finally {
      setReviewing(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await StationsAPI.details(stationId);
        const s: Station = r.data?.data;
        setStation(s);
        if (s?.typeOfConnectors?.[0]) setConnector(s.typeOfConnectors[0]);
      } catch (e) {
        toast.error(getApiError(e, "Failed to load station"));
      } finally {
        setLoading(false);
      }
    })();
  }, [stationId]);

  useEffect(() => {
    if (!station || !date) return;
    (async () => {
      try {
        const r = await BookingsAPI.availability({
          stationId,
          date,
          ...(connector ? { connectorType: connector } : {}),
        });
        setSlots(r.data?.data?.slots ?? []);
        setSelectedSlot(null);
      } catch (e) {
        toast.error(getApiError(e, "Failed to load slots"));
      }
    })();
  }, [station, date, connector, stationId]);

  useEffect(() => {
    if (!stationId) return;

    socket.emit("station:subscribe", stationId);

    const onStationUpdate = (data: any) => {
      if (data.stationId === stationId && data.updates) {
        setStation((prev) => (prev ? { ...prev, ...data.updates } : null));
      }
    };

    // ── This fires after every booking → re-fetches slots → availablePorts
    //    in ChargerAvailabilityCard updates automatically ──────────────────
    const onAvailabilityUpdate = (data: any) => {
      if (data.stationId === stationId) {
        const d = new Date(data.date).toISOString().split("T")[0];
        if (d === date) {
          BookingsAPI.availability({
            stationId,
            date,
            ...(connector ? { connectorType: connector } : {}),
          })
            .then((r) => {
              const newSlots = r.data?.data?.slots ?? [];
              setSlots(newSlots);
              // ── NEW: keep selectedSlot in sync so availability card refreshes
              setSelectedSlot((prev) => {
                if (!prev) return null;
                return newSlots.find((s: Slot) => s.startTime === prev.startTime) ?? null;
              });
            })
            .catch(console.error);
        }
      }
    };

    socket.on("station:updated", onStationUpdate);
    socket.on("availability:updated", onAvailabilityUpdate);

    return () => {
      socket.emit("station:unsubscribe", stationId);
      socket.off("station:updated", onStationUpdate);
      socket.off("availability:updated", onAvailabilityUpdate);
    };
  }, [stationId, date, connector]);

  const submitBooking = async () => {
    if (!selectedSlot || !endTime || !connector) {
      toast.error("Pick a start slot, end time, and connector");
      return;
    }
    if (endTime <= selectedSlot.startTime) {
      toast.error("End time must be after start time");
      return;
    }

    if (isSlotExpired(selectedSlot, date)) {
      toast.error("This slot has already passed. Please select a future slot.");
      setSelectedSlot(null);
      return;
    }

    // ── NEW: guard — no machines available for this slot ─────────────────
    if (selectedSlot.availableUnits === 0) {
      toast.error("No charger units available for this slot. Please choose another.");
      setSelectedSlot(null);
      return;
    }

    const pricing =
      station?.pricing?.find((p) => p.connectorType === connector) || station?.pricing?.[0];
    const pricePerKWh = pricing?.priceperKWh || 0;
    const currency = pricing?.currency || "INR";

    const startH = parseInt(selectedSlot.startTime.split(":")[0]);
    const startM = parseInt(selectedSlot.startTime.split(":")[1]);
    const endH = parseInt(endTime.split(":")[0]);
    const endM = parseInt(endTime.split(":")[1]);
    const durationHours = endH + endM / 60 - (startH + startM / 60);

    const estimatedKWh = station
      ? parseFloat((station.chargingSpeed * durationHours).toFixed(2))
      : 0;
    const totalCost = parseFloat((estimatedKWh * pricePerKWh).toFixed(2));
    const grandTotal = totalCost;
    const advancePayment = parseFloat((grandTotal * 0.2).toFixed(2));

    setBooking(true);

    try {
      await BookingsAPI.validate({
        station: stationId,
        connectorType: connector,
        date,
        startTime: selectedSlot.startTime,
        endTime,
        vehicleNumber,
      });
    } catch (error: any) {
      const responseData = error.response?.data || {};
      const { nextAvailableSlot, suggestion } = responseData;

      if (error.response?.status === 409 && nextAvailableSlot) {
        toast.error("Slot Taken", {
          description: suggestion || `This slot is no longer available.`,
          action: {
            label: `Book at ${nextAvailableSlot}`,
            onClick: () => {
              const suggested = slots.find((s) => s.startTime === nextAvailableSlot);
              if (suggested) {
                setSelectedSlot(suggested);
                setEndTime(suggested.endTime || endTime);
                toast.info(`Slot ${nextAvailableSlot} selected — review and confirm.`);
              } else {
                toast.warning("Suggested slot not in current list. Try refreshing.");
              }
            },
          },
        });
      } else {
        toast.error(getApiError(error, "Slot no longer available or overlapping booking exists."));
      }

      setBooking(false);
      return;
    }

    const executeBooking = async () => {
      try {
        const r = await BookingsAPI.create({
          station: stationId,
          connectorType: connector,
          date,
          startTime: selectedSlot.startTime,
          endTime,
          vehicleNumber,
        });
        const b = r.data?.data;
        toast.success("Booking confirmed!", { description: b?.otp });
        nav({ to: "/bookings" });
      } catch (e) {
        toast.error(getApiError(e, "Booking failed"));
        setBooking(false);
      }
    };

    if (advancePayment > 0) {
      if (!(window as any).Razorpay) {
        toast.error(
          "Payment gateway could not be loaded. Please check your internet connection or disable ad-blockers.",
        );
        setBooking(false);
        return;
      }

      try {
        const orderRes = await PaymentAPI.createOrder({ amount: advancePayment, currency });
        const order = orderRes.data;

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || "",
          amount: order.amount,
          currency: order.currency,
          name: "EvGenee Charging",
          description: "Booking at " + station?.name,
          order_id: order.id,
          handler: async function (response: any) {
            try {
              await PaymentAPI.updatePayment({
                orderId: order.id,
                paymentId: response.razorpay_payment_id,
                status: "paid",
              });
              await executeBooking();
            } catch (err) {
              toast.error("Failed to verify payment");
              setBooking(false);
            }
          },
          prefill: {
            name: user?.name || "EvGenee User",
            email: user?.email || "user@example.com",
            contact: "",
          },
          theme: { color: "#22c55e" },
          modal: {
            ondismiss: function () {
              toast.error("Payment cancelled");
              setBooking(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (response: any) {
          toast.error("Payment Failed: " + response.error.description);
          setBooking(false);
        });
        rzp.open();
      } catch (e) {
        toast.error(getApiError(e, "Failed to initiate payment. Please try again."));
        setBooking(false);
      }
    } else {
      await executeBooking();
    }
  };

  if (loading) {
    return (
      <div className="h-screen grid place-items-center bg-[#FAF9F6]">
        <div className="h-8 w-8 border-2 border-[#242426] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!station) return <div className="p-6">Station not found</div>;

  const avgRating = station.reviews?.length
    ? station.reviews.reduce((s, r) => s + r.rating, 0) / station.reviews.length
    : 0;
  const currency = station.pricing?.[0]?.currency ?? "INR";
  const minPrice = station.pricing?.length
    ? Math.min(...station.pricing.map((p) => p.priceperKWh))
    : 0;
  const [lng, lat] = station.location.coordinates;
  const isOpenNow = isStationOpenNow(station);

  const isMyStation =
    station &&
    user &&
    (typeof station.ownerofStation === "string"
      ? station.ownerofStation === user.id
      : station.ownerofStation._id === user.id);

  const peakInfo = selectedSlot
    ? isSlotInPeakHours(selectedSlot.startTime, (station as any).peakPricing)
    : { isPeak: false, multiplier: 1 };

  // ── NEW: total machines for selected connector type ───────────────────────
  const selectedPricing = station.pricing?.find((p) => p.connectorType === connector);
  const totalMachinesForConnector = selectedPricing?.portCount ?? 1;

  return (
    <div
      className="min-h-screen bg-[#FAF9F6] text-[#242426] pb-12"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Hero */}
      <div className="relative h-64 bg-[#EAEAEA] overflow-hidden border-b border-[#D1D1D1]">
        {station.Images?.[0] && (
          <img
            src={station.Images[0]}
            alt={station.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#242426]/75 via-[#242426]/30 to-transparent" />
        <button
          onClick={() => nav({ to: "/" })}
          className="absolute top-4 left-4 h-10 w-10 rounded-[4px] bg-white border border-[#D1D1D1] grid place-items-center hover:bg-[#FAF9F6] transition-colors shadow-sm"
          style={{ marginTop: "var(--safe-top)" }}
        >
          <ArrowLeft className="h-5 w-5 text-[#242426]" />
        </button>
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className={cn(
              "text-[10px] font-bold px-2.5 py-0.5 rounded-[4px] border uppercase font-space tracking-wider",
              isOpenNow 
                ? "bg-[#E2F3EC] text-[#0F9F59] border-[#CDECE0]" 
                : "bg-[#EAEAEA] text-[#4A6163] border-[#D1D1D1]"
            )}>
              {isOpenNow ? "Open Now" : "Currently Closed"}
            </span>
            <span className="text-[10px] font-bold tracking-wider bg-[#242426]/60 text-white px-2 py-0.5 rounded-[4px] backdrop-blur-sm uppercase font-space">
              {station.openingHours || "24/7 Service"}
            </span>
          </div>
          <h1 className="text-2xl font-bold font-space uppercase tracking-tight text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {station.name}
          </h1>
          <p className="text-xs text-white/90 flex items-center gap-1.5 mt-1 font-medium">
            <MapPin className="h-3.5 w-3.5 text-white/80 shrink-0" /> 
            {station.address.street}, {station.address.city}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 mt-6 space-y-6">
        {/* Quick stats */}
        <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-4 grid grid-cols-2 gap-2 shadow-sm">
          <div className="text-center border-r border-[#EAEAEA]">
            <p className="text-[#C64F38] font-bold text-sm font-space uppercase tracking-wider">
              {station.typeOfConnectors[0] ?? "—"}
            </p>
            <p className="text-[9px] text-[#4A6163] font-bold uppercase tracking-wider font-space mt-0.5">Connection</p>
          </div>
          <div className="text-center">
            <p className="text-[#242426] font-bold text-sm font-space uppercase tracking-wider">
              {formatCurrency(minPrice, currency)}
            </p>
            <p className="text-[9px] text-[#4A6163] font-bold uppercase tracking-wider font-space mt-0.5">Per kWh</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoRow
            icon={<Zap className="h-4 w-4" />}
            label={`${station.chargingSpeed} kW`}
            sub="Speed"
          />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label={`${station.availablePorts}/${station.totalPorts} ports`}
            sub={station.openingHours}
          />
          <InfoRow
            icon={<Phone className="h-4 w-4" />}
            label={station.contactInfo.phoneNumber}
            sub="Contact"
          />
          <InfoRow
            icon={<Star className="h-4 w-4" />}
            label={avgRating ? avgRating.toFixed(1) : "—"}
            sub={`${station.reviews?.length ?? 0} reviews`}
          />
        </div>

        {/* Station Support / Mechanic */}
        {station.mechanic && station.mechanic.name && (
          <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-5 shadow-sm flex flex-col space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Wrench className="h-20 w-20 text-[#4A6163]" />
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="h-10 w-10 rounded-[4px] bg-[#FBE8E4] border border-[#FBDED9] flex items-center justify-center shrink-0">
                <Wrench className="h-5 w-5 text-[#C64F38]" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-[#4A6163] uppercase tracking-widest mb-0.5 font-space">Station Support</p>
                <p className="font-bold text-sm text-[#242426]">{station.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#4A6163] font-medium">{station.mechanic.speciality}</span>
                  {station.mechanic.rating && (
                    <span className="flex items-center gap-0.5 text-xs font-bold text-[#C64F38]">
                      <Star className="h-3 w-3 fill-[#C64F38] text-[#C64F38]" /> {station.mechanic.rating}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <a 
              href={`tel:${station.mechanic.phone}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#FAF9F6] hover:bg-[#FAF9F6]/50 text-[#C64F38] border border-[#C64F38] rounded-[4px] font-bold text-xs transition-colors relative z-10 font-space uppercase tracking-wider"
            >
              <Phone className="h-4 w-4" /> Call {station.mechanic.phone}
            </a>
          </div>
        )}

        {/* Booking Section */}
        {isMyStation ? (
          <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-6 text-center shadow-sm space-y-4">
            <LayoutDashboard className="h-10 w-10 mx-auto text-[#C64F38]" />
            <h2 className="font-bold text-lg text-[#242426] font-space uppercase">Your Station</h2>
            <p className="text-xs text-[#4A6163] pb-2 font-medium">
              As the owner, you can manage bookings and settings from your dashboard.
            </p>
            <Button
              onClick={() => nav({ to: "/owner/stations/$stationId", params: { stationId } })}
              className="w-full h-11 bg-[#242426] hover:bg-[#343436] text-white font-bold text-xs rounded-[4px] font-space uppercase tracking-wider shadow-sm"
            >
              VIEW BOOKINGS DASHBOARD
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-6 shadow-sm space-y-5">
            <h2 className="font-bold text-base text-[#242426] font-space uppercase tracking-wider border-b border-[#EAEAEA] pb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Book a Slot
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Date</Label>
                <Input
                  type="date"
                  value={date}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] focus:border-[#C64F38] focus:ring-[#C64F38] h-10 text-sm rounded-[4px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Connector</Label>
                <Select value={connector} onValueChange={setConnector}>
                  <SelectTrigger className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] h-10 text-sm rounded-[4px] focus:border-[#C64F38] focus:ring-[#C64F38]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-[#D1D1D1] text-[#242426] rounded-[4px]">
                    {station.typeOfConnectors.map((c) => {
                      const portCount =
                        station.pricing?.find((p) => p.connectorType === c)?.portCount ?? 1;
                      return (
                        <SelectItem key={c} value={c}>
                          {c} · {portCount} machine{portCount !== 1 ? "s" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {connector && slots.length > 0 && (
              <ChargerAvailabilityCard
                connector={connector}
                totalMachines={totalMachinesForConnector}
                slots={slots}
                date={date}
                selectedSlot={selectedSlot}
              />
            )}

            <div>
              <Label className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space mb-2 block">Start Time</Label>
              <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto">
                {slots.map((s) => {
                  const expired = isSlotExpired(s, date);
                  const isDisabled = !s.isAvailable || expired;
                  const isSelected = selectedSlot?.startTime === s.startTime;

                  return (
                    <button
                      key={s.startTime}
                      disabled={isDisabled}
                      onClick={() => {
                        setSelectedSlot(s);
                        if (!endTime) setEndTime(s.endTime);
                      }}
                      className={cn(
                        "text-[10px] font-bold py-3.5 rounded-[4px] border transition relative font-space uppercase tracking-wider",
                        isSelected
                          ? "bg-[#242426] text-white border-transparent shadow-sm"
                          : expired
                          ? "bg-[#FAF9F6] text-[#4A6163]/40 border-[#EAEAEA] cursor-not-allowed opacity-50"
                          : s.isAvailable
                          ? "bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] hover:border-[#C64F38]"
                          : "bg-[#FAF9F6] text-[#4A6163]/40 border-[#EAEAEA] cursor-not-allowed opacity-50",
                      )}
                    >
                      {s.startTime}
                      {s.isAvailable && !expired && (
                        <span className="text-[8px] block font-bold opacity-80 mt-1 uppercase">
                          {s.availableUnits}/{s.totalUnits || totalMachinesForConnector || 1} Free
                        </span>
                      )}
                      {expired && (
                        <span className="text-[8px] block font-bold text-[#C64F38] leading-tight mt-1 uppercase">
                          PAST
                        </span>
                      )}
                    </button>
                  );
                })}
                {slots.length === 0 && (
                  <p className="col-span-4 text-xs font-bold text-[#4A6163]/40 py-4 text-center font-space uppercase tracking-wider">
                    No slots available
                  </p>
                )}
              </div>
            </div>

            {/* Peak pricing badge */}
            {peakInfo.isPeak && (
              <div className="flex items-center gap-2 bg-[#FDF3E3] border border-[#FCE6CF] rounded-[4px] px-3 py-2.5">
                <Zap className="h-4 w-4 text-[#F39C12] shrink-0" />
                <p className="text-[10px] font-bold text-[#F39C12] font-space uppercase tracking-wider leading-tight">
                  ⚡ Peak Hours — {peakInfo.multiplier}x Rate applies to this slot
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space">End Time</Label>
                <div className="relative">
                  <Input 
                    type="time" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] focus:border-[#C64F38] focus:ring-[#C64F38] h-10 text-sm rounded-[4px] pl-10"
                  />
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A6163]/60" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Duration</Label>
                <div className="h-10 flex items-center px-3 bg-[#FAF9F6] rounded-[4px] border border-[#D1D1D1] text-[10px] font-bold text-[#4A6163] font-space uppercase tracking-wider">
                  {selectedSlot ? "60 mins" : "—"}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Vehicle Information</Label>
              
              {/* Fleet Selector (Badges) */}
              {user?.savedVehicles && user.savedVehicles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-[#4A6163] uppercase tracking-wider font-space">Select from your fleet:</p>
                  <div className="flex flex-wrap gap-2">
                    {user.savedVehicles.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setVehicleNumber(v.vehicleNumber || "")}
                        className={cn(
                          "px-3 py-2 rounded-[4px] border text-[10px] font-bold transition-all flex items-center gap-1.5 font-space uppercase tracking-wider",
                          vehicleNumber === v.vehicleNumber
                            ? "bg-[#FBE8E4] border-[#FBDED9] text-[#C64F38] shadow-sm"
                            : "bg-[#FAF9F6] border-[#D1D1D1] hover:border-[#4A6163] text-[#4A6163]"
                        )}
                      >
                        <Car className="h-3 w-3" />
                        {v.nickname}
                        <span className="text-[9px] opacity-50 font-normal">({v.vehicleNumber})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold text-[#4A6163] uppercase tracking-wider font-space">
                    {user?.savedVehicles && user.savedVehicles.length > 0 ? "Or enter manually:" : "Enter Vehicle Number:"}
                  </p>
                  {vehicleNumber && (
                    <button 
                      onClick={() => setVehicleNumber("")}
                      className="text-[10px] text-[#C64F38] font-bold uppercase font-space"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    placeholder="e.g. MH 01 AB 1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] focus:border-[#C64F38] focus:ring-[#C64F38] h-11 text-sm font-mono tracking-widest pl-10 rounded-[4px]"
                  />
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A6163]/60" />
                </div>
                {(!user?.savedVehicles || user.savedVehicles.length === 0) && (
                  <p className="text-[10px] text-[#4A6163] font-medium">
                    Tip: Save your cars in <Link to="/profile" className="text-[#C64F38] underline font-bold hover:text-[#B53F29]">Profile</Link> for one-tap booking.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  sessionStorage.setItem("pendingDirections", stationId);
                  nav({ to: "/" });
                }}
                className="h-12 border border-[#D1D1D1] bg-[#FAF9F6] text-[#242426] hover:bg-[#EAEAEA] rounded-[4px] text-xs font-bold font-space uppercase tracking-wider shadow-sm flex items-center justify-center"
              >
                <Navigation className="h-4 w-4 mr-1 text-[#242426]" /> Navigate
              </Button>
              <Button
                onClick={submitBooking}
                disabled={booking || !selectedSlot}
                className="h-12 bg-[#C64F38] hover:bg-[#B53F29] text-white rounded-[4px] text-xs font-bold font-space uppercase tracking-wider shadow-sm flex items-center justify-center disabled:opacity-50"
              >
                {booking ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "PAY 20% ADVANCE"}
              </Button>
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
            <h3 className="font-bold text-base text-[#242426] font-space uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Reviews</h3>
            {avgRating > 0 && (
              <div className="flex items-center gap-1 text-[#C64F38] text-xs font-bold font-space uppercase">
                <Star className="h-4 w-4 fill-current text-[#C64F38]" />
                {avgRating.toFixed(1)}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {station.reviews?.slice(0, 5).map((r, i) => (
              <div key={i} className="border-b border-[#EAEAEA] pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-1 text-[#C64F38] mb-1">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star
                      key={k}
                      className={`h-3 w-3 ${k < r.rating ? "fill-[#C64F38]" : "opacity-30"}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-[#242426] leading-relaxed font-medium mt-1">{r.comment}</p>
              </div>
            ))}
            {(!station.reviews || station.reviews.length === 0) && (
              <p className="text-xs font-bold text-[#4A6163]/40 text-center py-4 font-space uppercase tracking-wider">
                No reviews yet. Be the first!
              </p>
            )}
          </div>

          {/* Add Review Form */}
          <div className="pt-4 border-t border-[#EAEAEA]">
            <p className="text-xs font-bold text-[#242426] uppercase tracking-wider font-space mb-3">Leave a Review</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="transition-transform active:scale-90 text-[#C64F38]"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= reviewRating
                          ? "fill-[#C64F38]"
                          : "text-[#4A6163]/30 opacity-30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Share your experience..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="bg-[#FAF9F6] border border-[#D1D1D1] text-[#242426] focus:border-[#C64F38] focus:ring-[#C64F38] h-10 text-xs rounded-[4px] px-3.5"
                />
                <Button
                  size="icon"
                  onClick={submitReview}
                  disabled={reviewing || !reviewComment.trim()}
                  className="h-10 w-10 bg-[#C64F38] hover:bg-[#B53F29] text-white rounded-[4px] flex items-center justify-center shrink-0 shadow-sm"
                >
                  {reviewing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Send className="h-4 w-4 text-white" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Link to="/bookings" className="block text-center text-xs text-[#C64F38] hover:text-[#B53F29] font-bold uppercase tracking-wider font-space py-2">
          View my bookings →
        </Link>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-3 flex items-center gap-3 shadow-sm">
      <div className="h-9 w-9 rounded-[4px] bg-[#FAF9F6] border border-[#EAEAEA] grid place-items-center text-[#4A6163]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-bold text-xs text-[#242426] font-space uppercase tracking-wider truncate">{label}</p>
        <p className="text-[9px] text-[#4A6163] font-bold uppercase tracking-wider font-space truncate">{sub}</p>
      </div>
    </div>
  );
}
