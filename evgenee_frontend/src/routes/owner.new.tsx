import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { StationsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LocationPicker } from "@/components/LocationPicker";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { getApiError } from "@/lib/utils";

export const Route = createFileRoute("/owner/new")({
  component: NewStation,
});

function NewStation() {
  const { isOwner, isAuthed, loading } = useAuth();
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    operator: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
    lat: "",
    lng: "",
    totalPorts: "4",
    availablePorts: "4",
    chargingSpeed: "50",
    openingHours: "06:00 - 22:00",
    phone: "",
    email: "",
    amenities: "Restroom, Cafe, WiFi",
    image: "",
    isOpen: true,
  });
  const [connectors, setConnectors] = useState<{ type: string; price: string }[]>([
    { type: "CCS2", price: "18" },
    { type: "Type2", price: "12" },
  ]);

  if (loading)
    return (
      <div className="h-screen grid place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  if (!isAuthed) return <Navigate to="/auth/login" />;
  if (!isOwner) return <Navigate to="/" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const types = connectors.map((c) => c.type);
      await StationsAPI.add({
        name: form.name,
        operator: form.operator,
        location: { type: "Point", coordinates: [parseFloat(form.lng), parseFloat(form.lat)] },
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          country: form.country,
          postalCode: form.postalCode,
        },
        amenities: form.amenities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        totalPorts: Number(form.totalPorts),
        availablePorts: Number(form.availablePorts),
        chargingSpeed: Number(form.chargingSpeed),
        typeOfConnectors: types,
        pricing: connectors.map((c) => ({
          connectorType: c.type,
          priceperKWh: Number(c.price),
          currency: "INR",
        })),
        openingHours: form.openingHours,
        contactInfo: { phoneNumber: form.phone, email: form.email },
        Images: form.image
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        isOpen: form.isOpen,
      });
      toast.success("Station added!");
      nav({ to: "/owner" });
    } catch (e) {
      toast.error(getApiError(e, "Failed to add station"));
    } finally {
      setSubmitting(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    toast.info("Fetching your location...");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setForm((f) => ({
          ...f,
          lat: p.coords.latitude.toString(),
          lng: p.coords.longitude.toString(),
        }));
        toast.success("Location fetched successfully!");
      },
      (error) => {
        let msg = "Couldn't get your location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission denied. Please enable it in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          msg = "The request to get user location timed out.";
        }
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div
      className="max-w-2xl mx-auto p-4 pb-8 relative min-h-screen"
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

      <button
        onClick={() => nav({ to: "/owner" })}
        className="mb-4 flex items-center gap-1.5 text-[10px] font-bold text-[#4A6163] hover:text-[#242426] font-space uppercase tracking-wider transition-colors relative z-10"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="text-2xl font-bold text-[#242426] font-space uppercase tracking-tight mb-5 relative z-10" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Add Station</h1>

      <form onSubmit={submit} className="space-y-5 relative z-10">
        <Section title="Basic Info">
          <Field label="Name">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
            />
          </Field>
          <Field label="Operator">
            <Input
              required
              value={form.operator}
              onChange={(e) => setForm({ ...form, operator: e.target.value })}
              className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
            />
          </Field>
          <Field label="Image URLs (comma separated)">
            <Input
              required
              type="text"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://img1.com, https://img2.com"
              className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
            />
          </Field>

          <div className="flex items-center justify-between py-1">
            <Label
              className="cursor-pointer text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space"
              onClick={() => setForm({ ...form, isOpen: !form.isOpen })}
            >
              Station initially open
            </Label>
            <Switch
              checked={form.isOpen}
              onCheckedChange={(c) => setForm({ ...form, isOpen: c })}
              className="data-[state=checked]:bg-[#0F9F59] data-[state=unchecked]:bg-[#D1D1D1]"
            />
          </div>
        </Section>

        <Section title="Location">
          <Field label="Street">
            <Input
              required
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="City">
              <Input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
              />
            </Field>
            <Field label="State">
              <Input
                required
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Country">
              <Input
                required
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
              />
            </Field>
            <Field label="Postal Code">
              <Input
                required
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
              />
            </Field>
          </div>
          <div className="pt-2">
            <Label className="text-[10px] font-bold text-[#4A6163] block mb-2 uppercase tracking-wider font-space">Pin on Map</Label>
            <LocationPicker
              lat={parseFloat(form.lat) || 0}
              lng={parseFloat(form.lng) || 0}
              onChange={(lat, lng) =>
                setForm((f) => ({ ...f, lat: lat.toString(), lng: lng.toString() }))
              }
            />
            {(!form.lat || !form.lng) && (
              <p className="text-[10px] font-bold text-[#C64F38] mt-1 font-space uppercase">Please set a location on the map</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={useMyLocation}
            className="w-full border-[#D1D1D1] text-[#4A6163] hover:bg-[#FAF9F6] rounded-[4px] text-xs uppercase tracking-wider font-space h-10 transition-colors"
          >
            Use my current location
          </Button>
        </Section>

        <Section title="Capacity & Hours">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Total ports">
              <Input
                type="number"
                required
                value={form.totalPorts}
                onChange={(e) => setForm({ ...form, totalPorts: e.target.value })}
                className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
              />
            </Field>
            <Field label="Available">
              <Input
                type="number"
                required
                value={form.availablePorts}
                onChange={(e) => setForm({ ...form, availablePorts: e.target.value })}
                className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
              />
            </Field>
            <Field label="Speed (kW)">
              <Input
                type="number"
                required
                value={form.chargingSpeed}
                onChange={(e) => setForm({ ...form, chargingSpeed: e.target.value })}
                className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
              />
            </Field>
          </div>
          <Field label="Opening hours (e.g. 06:00 - 22:00)">
            <Input
              required
              value={form.openingHours}
              onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
              className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
            />
          </Field>
        </Section>

        <Section title="Connectors & Pricing">
          <Label className="text-[10px] font-bold text-[#4A6163] block mb-2 uppercase tracking-wider font-space">Connectors</Label>
          {connectors.map((c, i) => (
            <div key={i} className="flex gap-2">
              <select
                className="flex-1 bg-[#FAF9F6] border border-[#D1D1D1] text-[#242426] text-xs h-10 rounded-[4px] px-3 focus:outline-none focus:border-[#C64F38]"
                value={c.type}
                onChange={(e) =>
                  setConnectors(
                    connectors.map((x, idx) => (idx === i ? { ...x, type: e.target.value } : x)),
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
                  setConnectors(
                    connectors.map((x, idx) => (idx === i ? { ...x, price: e.target.value } : x)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setConnectors(connectors.filter((_, idx) => idx !== i))}
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
            onClick={() => setConnectors([...connectors, { type: "Type2", price: "10" }])}
            className="border-[#D1D1D1] text-[#4A6163] hover:bg-[#FAF9F6] rounded-[4px] text-[10px] uppercase font-bold tracking-wider font-space h-9 self-start"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add connector
          </Button>
        </Section>

        <Section title="Contact & Amenities">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Phone">
              <Input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
              />
            </Field>
            <Field label="Email">
              <Input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
              />
            </Field>
          </div>
          <Field label="Amenities (comma separated)">
            <Input
              value={form.amenities}
              onChange={(e) => setForm({ ...form, amenities: e.target.value })}
              className="bg-[#FAF9F6] border-[#D1D1D1] text-[#242426] placeholder:text-[#4A6163]/30 h-10 text-sm rounded-[4px] focus-visible:ring-0 focus-visible:border-[#C64F38] focus:border-[#C64F38]"
            />
          </Field>
        </Section>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-[#242426] hover:bg-[#343436] text-white font-bold rounded-[4px] text-xs uppercase tracking-wider transition-all font-space shadow-sm flex items-center justify-center"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Create Station"}
        </Button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#D1D1D1] rounded-[4px] p-5 shadow-sm space-y-4">
      <h3 className="font-bold text-xs text-[#C64F38] uppercase tracking-wider font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold text-[#4A6163] uppercase tracking-wider font-space ml-1">{label}</Label>
      {children}
    </div>
  );
}
