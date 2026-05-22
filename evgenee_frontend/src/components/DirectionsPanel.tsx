import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Car,
  Bike,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Clock,
  Route,
} from "lucide-react";
import type { Station } from "@/lib/api";

export type TransportMode = "driving" | "walking" | "cycling";

export interface OsrmStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: { type: string; modifier?: string; location: [number, number] };
}

export interface RouteOption {
  distanceKm: number;
  durationMin: number;
  steps: OsrmStep[];
  coords: [number, number][];
}

export interface DirectionsPanelProps {
  station: Station;
  userLocation: [number, number];
  mode: TransportMode;
  onModeChange: (m: TransportMode) => void;
  routes: RouteOption[];
  selectedIdx: number;
  onSelectRoute: (i: number) => void;
  loading: boolean;
  onClose: () => void;
  onStart: () => void;
}

// ── helpers ───────────────────────────────────────────────────────────────────
export function fmtDist(km: number) {
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
}
export function fmtTime(min: number) {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} hr ${min % 60} min`;
}

export function stepIcon(type: string, mod?: string): string {
  if (type === "depart") return "▶";
  if (type === "arrive") return "⬤";
  if (type === "roundabout" || type === "rotary") return "↻";
  if (mod === "uturn") return "↩";
  if (mod === "sharp left" || mod === "left") return "←";
  if (mod === "sharp right" || mod === "right") return "→";
  if (mod === "slight left") return "↖";
  if (mod === "slight right") return "↗";
  return "↑";
}

export function stepLabel(type: string, mod?: string, name?: string): string {
  const road = name && name !== "" ? ` onto ${name}` : "";
  if (type === "depart") return "Start" + (name ? ` on ${name}` : "");
  if (type === "arrive") return "Arrive at destination";
  if (type === "roundabout" || type === "rotary") return `Take roundabout${road}`;
  if (mod === "uturn") return "Make a U-turn";
  if (mod === "sharp left") return `Sharp left${road}`;
  if (mod === "left") return `Turn left${road}`;
  if (mod === "slight left") return `Keep left${road}`;
  if (mod === "sharp right") return `Sharp right${road}`;
  if (mod === "right") return `Turn right${road}`;
  if (mod === "slight right") return `Keep right${road}`;
  if (name) return `Continue on ${name}`;
  return "Continue";
}

const MODES: { key: TransportMode; label: string; Icon: React.ElementType }[] = [
  { key: "driving", label: "Drive", Icon: Car },
  { key: "walking", label: "Walk", Icon: User },
  { key: "cycling", label: "Cycle", Icon: Bike },
];

const ROUTE_LABELS = ["Fastest", "Alternative", "Scenic"];

// ── component ─────────────────────────────────────────────────────────────────
export default function DirectionsPanel({
  station,
  mode,
  onModeChange,
  routes,
  selectedIdx,
  onSelectRoute,
  loading,
  onClose,
  onStart,
}: DirectionsPanelProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const sel = routes[selectedIdx];
  const [lng, lat] = station.location.coordinates;

  // reset steps view when mode changes
  useEffect(() => setStepsOpen(false), [mode]);

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: 12,
    left: 12,
    width: "min(370px, calc(100vw - 24px))",
    maxHeight: "calc(100vh - 24px)",
    overflowY: "auto",
    zIndex: 99999,
    background: "#FAF9F6",
    border: "1px solid #D1D1D1",
    borderRadius: 4,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    fontFamily: "'Inter', sans-serif",
    scrollbarWidth: "none",
  };

  const panel = (
    <div style={panelStyle}>
      {/* ── Header ── */}
      <div
        style={{
          padding: "14px 16px 10px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid #EAEAEA",
          position: "sticky",
          top: 0,
          background: "#FAF9F6",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            background: "#242426",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Route size={15} color="#FAF9F6" />
        </div>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 13, color: "#242426", flex: 1, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Directions
        </p>
        <button
          onClick={onClose}
          style={{
            width: 30,
            height: 30,
            borderRadius: 4,
            border: "1px solid #D1D1D1",
            background: "#ffffff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4A6163",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── From / To ── */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #EAEAEA" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#FAF9F6",
                border: "2px solid #4A6163",
              }}
            />
            <div
              style={{
                width: 1.5,
                height: 22,
                background: "#D1D1D1",
                borderRadius: 2,
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#C64F38",
                border: "2px solid #C64F38",
              }}
            />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #D1D1D1",
                borderRadius: 4,
                padding: "7px 12px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  color: "#4A6163",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontFamily: "'Space Grotesk', sans-serif"
                }}
              >
                From
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#242426", fontWeight: 700 }}>
                Your Location
              </p>
            </div>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #C64F38",
                borderRadius: 4,
                padding: "7px 12px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  color: "#C64F38",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontFamily: "'Space Grotesk', sans-serif"
                }}
              >
                To
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#242426",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {station.name}
              </p>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: "#4A6163", fontWeight: 500 }}>
                {station.address?.city}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Transport mode tabs ── */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid #EAEAEA",
          display: "flex",
          gap: 8,
        }}
      >
        {MODES.map(({ key, label, Icon }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              onClick={() => onModeChange(key)}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 4,
                border: `1.5px solid ${active ? "#242426" : "#D1D1D1"}`,
                background: active ? "#242426" : "#ffffff",
                color: active ? "#FAF9F6" : "#4A6163",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                transition: "all 0.15s",
              }}
            >
              <Icon size={14} />
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'Space Grotesk', sans-serif" }}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div
          style={{
            padding: "28px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Loader2 size={24} color="#C64F38" style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#4A6163", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'Space Grotesk', sans-serif" }}>
            Calculating routes…
          </p>
        </div>
      )}

      {/* ── Route cards ── */}
      {!loading && routes.length > 0 && (
        <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {routes.map((r, i) => {
            const active = i === selectedIdx;
            return (
              <button
                key={i}
                onClick={() => onSelectRoute(i)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "11px 14px",
                  borderRadius: 4,
                  cursor: "pointer",
                  border: `1.5px solid ${active ? "#C64F38" : "#D1D1D1"}`,
                  background: active ? "#ffffff" : "#ffffff",
                  boxShadow: active ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: active ? "#C64F38" : "#4A6163",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontFamily: "'Space Grotesk', sans-serif"
                      }}
                    >
                      {ROUTE_LABELS[i] ?? `Route ${i + 1}`}
                    </span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 900,
                          color: "#242426",
                          fontFamily: "'Space Grotesk', sans-serif"
                        }}
                      >
                        {fmtTime(r.durationMin)}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#4A6163",
                          fontWeight: 600,
                        }}
                      >
                        {fmtDist(r.distanceKm)}
                      </span>
                    </div>
                  </div>
                  {active && (
                    <button
                      onClick={onStart}
                      style={{
                        background: "#242426",
                        borderRadius: 2,
                        padding: "6px 14px",
                        border: "none",
                        cursor: "pointer",
                        transition: "transform 0.1s ease",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#ffffff", fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>GO ▶</span>
                    </button>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── No route found ── */}
      {!loading && routes.length === 0 && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#4A6163", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'Space Grotesk', sans-serif" }}>
            No route found for this mode.
          </p>
        </div>
      )}

      {/* ── Step by step ── */}
      {!loading && sel && sel.steps.length > 0 && (
        <div style={{ borderTop: "1px solid #EAEAEA" }}>
          <button
            onClick={() => setStepsOpen((v) => !v)}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#4A6163",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontFamily: "'Space Grotesk', sans-serif"
              }}
            >
              Step-by-step · {sel.steps.length} steps
            </span>
            {stepsOpen ? (
              <ChevronUp size={14} color="#4A6163" />
            ) : (
              <ChevronDown size={14} color="#4A6163" />
            )}
          </button>
          {stepsOpen && (
            <div
              style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 2 }}
            >
              {sel.steps.map((step, i) => {
                const icon = stepIcon(step.maneuver.type, step.maneuver.modifier);
                const label = stepLabel(step.maneuver.type, step.maneuver.modifier, step.name);
                const isLast = i === sel.steps.length - 1;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "8px 0",
                      borderBottom: isLast ? "none" : "1px solid #EAEAEA",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        background: "#242426",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 12,
                        color: "#FAF9F6",
                        fontWeight: 700,
                      }}
                    >
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: "#242426",
                          fontWeight: 600,
                          lineHeight: 1.3,
                        }}
                      >
                        {label}
                      </p>
                      {step.distance > 0 && (
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 11,
                            color: "#4A6163",
                          }}
                        >
                          {fmtDist(step.distance / 1000)}
                          {step.duration > 0 && ` · ${fmtTime(Math.round(step.duration / 60))}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Footer: OSRM Attribution ── */}
      <div style={{ padding: "10px 16px 14px", borderTop: "1px solid #EAEAEA" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={13} color="#4A6163" />
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#4A6163", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'Space Grotesk', sans-serif" }}>
            Route via OpenStreetMap · OSRM
          </p>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}
