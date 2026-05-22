import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookingsAPI, PaymentAPI, type Booking, type Station } from "@/lib/api";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Zap,
  X,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChargingStation } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { formatCurrency, getApiError } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/bookings")({
  component: BookingsPage,
});

const statusColor: Record<string, string> = {
  confirmed: "bg-[#E2F3EC] text-[#0F9F59] border border-[#CDECE0]",
  "in-progress": "bg-[#E3EDFD] text-[#1A73E8] border border-[#CFDFFC]",
  completed: "bg-[#FAF9F6] text-[#4A6163] border border-[#EAEAEA]",
  cancelled: "bg-[#FBE8E4] text-[#C64F38] border border-[#FBDED9]",
  pending: "bg-[#FDF3E3] text-[#F39C12] border border-[#FCE6CF]",
  "no-show": "bg-[#FBE8E4] text-[#C64F38] border border-[#FBDED9]",
};

const iconColor: Record<string, string> = {
  confirmed: "bg-[#E2F3EC] text-[#0F9F59]",
  "in-progress": "bg-[#E3EDFD] text-[#1A73E8]",
  completed: "bg-[#EAEAEA] text-[#4A6163]",
  cancelled: "bg-[#FBE8E4] text-[#C64F38]",
  pending: "bg-[#FDF3E3] text-[#F39C12]",
  "no-show": "bg-[#FBE8E4] text-[#C64F38]",
};

function PendingCountdown({ createdAt }: { createdAt: string }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const created = new Date(createdAt).getTime();
      const expiresAt = created + 10 * 60 * 1000;
      const now = new Date().getTime();
      return Math.max(0, Math.floor((expiresAt - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  const m = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const s = (timeLeft % 60).toString().padStart(2, "0");

  if (timeLeft === 0) return <span className="text-[#C64F38] font-bold text-[10px] font-space uppercase">Expired</span>;
  return (
    <span className="text-[#F39C12] font-bold text-[10px] animate-pulse flex items-center gap-1 font-space uppercase">
      <Clock className="h-2.5 w-2.5" /> {m}:{s} left
    </span>
  );
}

function BookingsPage() {
  const { isAuthed, loading: authLoading, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const showDetails = async (id: string) => {
    setLoadingDetail(true);
    try {
      const r = await BookingsAPI.details(id);
      setSelectedBooking(r.data?.data);
    } catch (e) {
      toast.error(getApiError(e, "Failed to load details"));
    } finally {
      setLoadingDetail(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await BookingsAPI.my({ limit: 50 });
      setBookings(r.data?.data ?? []);
    } catch (e) {
      toast.error(getApiError(e, "Failed to load bookings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthed) {
      load();
      const reload = () => load();
      socket.on("booking:created", reload);
      socket.on("booking:cancelled", reload);
      socket.on("booking:checkedIn", reload);
      socket.on("booking:completed", reload);
      socket.on("bookings:autoCompleted", reload);
      return () => {
        socket.off("booking:created", reload);
        socket.off("booking:cancelled", reload);
        socket.off("booking:checkedIn", reload);
        socket.off("booking:completed", reload);
        socket.off("bookings:autoCompleted", reload);
      };
    }
  }, [isAuthed]);

  if (authLoading)
    return (
      <div className="h-screen grid place-items-center bg-[#FAF9F6]">
        <div className="h-8 w-8 border-2 border-[#242426] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!isAuthed) return <Navigate to="/auth/login" />;

  const filtered = bookings.filter((b) => {
    if (tab === "all") return true;
    if (tab === "active") return ["confirmed", "in-progress", "pending"].includes(b.status);
    if (tab === "history") return ["completed", "cancelled", "no-show"].includes(b.status);
    return true;
  });

  const cancel = async (b: Booking) => {
    setBusyId(b._id);
    try {
      const r = await BookingsAPI.cancel(b._id, { reason: "User cancelled" });
      toast.success(`Cancelled`);
      load();
    } catch (e) {
      toast.error(getApiError(e, "Cancel failed"));
    } finally {
      setBusyId(null);
    }
  };

  const complete = async (b: Booking) => {
    setBusyId(b._id);
    const executeComplete = async () => {
      try {
        await BookingsAPI.complete(b._id);
        toast.success("Session completed!");
        setBusyId(null);
        load();
      } catch (e) {
        toast.error(getApiError(e, "Complete failed"));
        setBusyId(null);
      }
    };
    const remainingPayment = parseFloat((b.grandTotal * 0.8).toFixed(2));
    if (remainingPayment > 0) {
      try {
        const station = typeof b.station === "object" ? (b.station as Station) : null;
        const pricing = station?.pricing?.find((p) => p.connectorType === b.connectorType) || station?.pricing?.[0];
        const currency = pricing?.currency || "INR";
        const orderRes = await PaymentAPI.createOrder({ amount: remainingPayment, currency });
        const order = orderRes.data;
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || "",
          amount: order.amount,
          currency: order.currency,
          name: "EvGenee",
          description: `Payment for ${station?.name || "Booking"}`,
          order_id: order.id,
          handler: async function (response: any) {
            try {
              await PaymentAPI.updatePayment({ orderId: order.id, paymentId: response.razorpay_payment_id, status: "paid" });
              await executeComplete();
            } catch (err) {
              toast.error("Payment verification failed");
              setBusyId(null);
            }
          },
          prefill: { name: user?.name, email: user?.email },
          theme: { color: "#10b981" },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } catch (e) {
        toast.error("Payment initiation failed");
        setBusyId(null);
      }
    } else {
      await executeComplete();
    }
  };

  const payAdvance = async (b: Booking) => {
    setBusyId(b._id);
    const executeConfirmAdvance = async () => {
      try {
        await BookingsAPI.confirmAdvance(b._id);
        toast.success("Advance paid!");
        setBusyId(null);
        load();
      } catch (e) {
        toast.error(getApiError(e, "Confirmation failed"));
        setBusyId(null);
      }
    };
    const advancePayment = parseFloat((b.grandTotal * 0.2).toFixed(2));
    if (advancePayment > 0) {
      try {
        const station = typeof b.station === "object" ? (b.station as Station) : null;
        const orderRes = await PaymentAPI.createOrder({ amount: advancePayment, currency: "INR" });
        const order = orderRes.data;
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || "",
          amount: order.amount,
          currency: order.currency,
          name: "EvGenee",
          description: `Advance for ${station?.name || "Booking"}`,
          order_id: order.id,
          handler: async function (response: any) {
            try {
              await PaymentAPI.updatePayment({ orderId: order.id, paymentId: response.razorpay_payment_id, status: "paid" });
              await executeConfirmAdvance();
            } catch (err) {
              toast.error("Verification failed");
              setBusyId(null);
            }
          },
          prefill: { name: user?.name, email: user?.email },
          theme: { color: "#10b981" },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } catch (e) {
        toast.error("Payment failed");
        setBusyId(null);
      }
    } else {
      await executeConfirmAdvance();
    }
  };

  return (
    <div
      className="min-h-screen bg-[#FAF9F6] text-[#242426] overflow-x-hidden"
      style={{ paddingBottom: "6.5rem", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#242426] mb-2 font-space uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            My Bookings
          </h1>
          <p className="text-[#4A6163] text-sm font-medium">Manage your charging fleet and sessions</p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="mb-8">
          <TabsList className="bg-[#FAF9F6] border border-[#D1D1D1] rounded-[4px] p-1 w-full flex">
            {["all", "active", "history"].map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="flex-1 rounded-[4px] text-xs font-bold uppercase tracking-widest data-[state=active]:bg-[#242426] data-[state=active]:text-white text-[#4A6163] hover:text-[#242426] transition-all py-3 font-space"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="space-y-4 mt-6">
            {loading ? (
              <div className="py-20 flex justify-center">
                <div className="h-8 w-8 border-2 border-[#242426] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-[#D1D1D1] rounded-[4px] bg-white shadow-sm">
                <Calendar className="h-10 w-10 text-[#4A6163]/30 mx-auto mb-3" />
                <p className="text-[#4A6163]/60 text-xs font-bold uppercase tracking-widest font-space">No sessions found</p>
              </div>
            ) : (
              filtered.map((b) => {
                const station = typeof b.station === "object" ? (b.station as Station) : null;
                const isBusy = busyId === b._id;
                const bgIcon = iconColor[b.status] ?? "bg-[#EAEAEA] text-[#4A6163]";
                return (
                  <div key={b._id} className="bg-white border border-[#D1D1D1] rounded-[4px] p-5 hover:border-[#4A6163] transition-all group shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-14 w-14 rounded-[4px] ${bgIcon} flex items-center justify-center shadow-sm`}>
                          <FontAwesomeIcon icon={faChargingStation} className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#242426] text-base leading-none mb-1.5 font-space uppercase">{station?.name ?? "Charging Station"}</h3>
                          <p className="text-xs text-[#4A6163] flex items-center gap-1.5 font-medium">
                            <MapPin className="h-3 w-3 text-[#4A6163]" /> {station?.address?.city ?? "Location"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-[4px] ${statusColor[b.status]}`}>
                          {b.status}
                        </span>
                        {b.status === "pending" && b.createdAt && <PendingCountdown createdAt={b.createdAt} />}
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="bg-[#FAF9F6] rounded-[4px] p-3 border border-[#EAEAEA] flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-[#4A6163]" />
                        <div>
                          <p className="text-[8px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Date</p>
                          <p className="text-xs font-bold text-[#242426]">{format(new Date(b.date), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                      <div className="bg-[#FAF9F6] rounded-[4px] p-3 border border-[#EAEAEA] flex items-center gap-3">
                        <Clock className="h-4 w-4 text-[#4A6163]" />
                        <div>
                          <p className="text-[8px] text-[#4A6163] font-bold uppercase tracking-wider font-space">Time Slot</p>
                          <p className="text-xs font-bold text-[#242426]">{b.startTime} – {b.endTime}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-[#EAEAEA] pt-5">
                      <div>
                        <p className="text-[10px] text-[#4A6163] font-bold uppercase tracking-wider font-space mb-1">{b.connectorType} · {b.estimatedKWh} kWh</p>
                        <p className="text-xl font-bold text-[#242426] font-space">{formatCurrency(b.grandTotal)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => showDetails(b._id)}
                          className="h-10 px-4 rounded-[4px] bg-[#FAF9F6] border border-[#D1D1D1] text-xs font-bold text-[#242426] hover:bg-[#EAEAEA] transition-colors font-space uppercase tracking-wider"
                        >
                          Details
                        </button>
                        {b.status === "confirmed" && (
                          <button
                            onClick={() => cancel(b)}
                            disabled={isBusy}
                            className="h-10 px-4 rounded-[4px] bg-[#FBE8E4] border border-[#FBDED9] text-[#C64F38] text-xs font-bold hover:bg-[#FBDED9] font-space uppercase tracking-wider"
                          >
                            Cancel
                          </button>
                        )}
                        {b.status === "in-progress" && (
                          <button
                            onClick={() => complete(b)}
                            disabled={isBusy}
                            className="h-10 px-5 rounded-[4px] bg-[#242426] text-white text-xs font-bold shadow-sm hover:bg-[#343436] active:scale-95 transition-all font-space uppercase tracking-wider"
                          >
                            Pay & Complete
                          </button>
                        )}
                        {b.status === "pending" && (
                          <button
                            onClick={() => payAdvance(b)}
                            disabled={isBusy}
                            className="h-10 px-5 rounded-[4px] bg-[#C64F38] text-white text-xs font-bold shadow-sm hover:bg-[#B53F29] active:scale-95 transition-all font-space uppercase tracking-wider"
                          >
                            Pay Advance
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedBooking} onOpenChange={(o) => !o && setSelectedBooking(null)}>
        <DialogContent className="max-w-md rounded-[4px] bg-white border border-[#D1D1D1] text-[#242426] p-8 shadow-lg">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold tracking-tight text-[#242426] font-space uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Booking Summary
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-[4px] ${iconColor[selectedBooking.status] ?? "bg-[#EAEAEA] text-[#4A6163]"} flex items-center justify-center shadow-sm`}>
                  <FontAwesomeIcon icon={faChargingStation} className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#242426] font-space uppercase">{(selectedBooking.station as Station)?.name}</h3>
                  <p className="text-sm text-[#4A6163] font-medium">{(selectedBooking.station as Station)?.address?.city}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[#FAF9F6] p-5 rounded-[4px] border border-[#EAEAEA]">
                {[
                  { l: "Status", v: selectedBooking.status, s: statusColor[selectedBooking.status] },
                  { l: "Connector", v: selectedBooking.connectorType },
                  { l: "Date", v: format(new Date(selectedBooking.date), "MMM d, yyyy") },
                  { l: "Time", v: `${selectedBooking.startTime} - ${selectedBooking.endTime}` },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[9px] font-bold text-[#4A6163] uppercase tracking-wider font-space">{item.l}</p>
                    {item.s ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${item.s} inline-block font-space uppercase`}>{item.v}</span>
                    ) : (
                      <p className="font-bold text-sm text-[#242426]">{item.v}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-bold text-[#4A6163] uppercase tracking-wider font-space ml-1">Payment Detail</p>
                <div className="bg-[#FAF9F6] border border-[#EAEAEA] rounded-[4px] p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#4A6163] font-medium">Base Charging</span>
                    <span className="text-[#242426] font-bold">{formatCurrency(selectedBooking.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-[#EAEAEA] pt-3">
                    <span className="text-[#242426] font-bold">Grand Total</span>
                    <span className="text-[#C64F38] font-bold">{formatCurrency(selectedBooking.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-8">
            <button
              className="w-full h-12 bg-[#242426] hover:bg-[#343436] text-white rounded-[4px] font-bold transition-colors font-space uppercase tracking-wider"
              onClick={() => setSelectedBooking(null)}
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
