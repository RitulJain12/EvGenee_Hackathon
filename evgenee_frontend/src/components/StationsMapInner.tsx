import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { Station } from "@/lib/api";
import { isStationOpenNow } from "@/lib/utils";
import { Star, Navigation } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChargingStation } from "@fortawesome/free-solid-svg-icons";
import type { NavigateFn } from "./StationsMap";
import DirectionsPanel, {
  type TransportMode,
  type RouteOption,
  stepIcon,
  stepLabel,
  fmtDist,
} from "./DirectionsPanel";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

// ── Icons ─────────────────────────────────────────────────────────────────────
function makeStationIcon(avail: boolean, active: boolean, closed?: boolean) {
  const size = active ? 44 : 36;
  const icon = renderToStaticMarkup(
    <FontAwesomeIcon
      icon={faChargingStation}
      style={{ width: active ? 20 : 17, height: active ? 20 : 17, color: "white" }}
    />,
  );
  
  let className = "ev-pin";
  if (closed) className += " closed-pin"; // Grey for closed
  else if (!avail) className += " unavail"; // Amber/Red for full
  if (active) className += " hovered";

  return L.divIcon({
    className: "",
    html: `<div class="${className}">${icon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

const userIcon = L.divIcon({
  className: "",
  html: `<div class="ev-user-dot"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const destIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 3px #3b82f644;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// ── OSRM Route Fetcher ────────────────────────────────────────────────────────
async function fetchRoutes(
  from: [number, number],
  to: [number, number],
  mode: TransportMode,
): Promise<RouteOption[]> {
  const url =
    `https://router.project-osrm.org/route/v1/${mode}/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}` +
    `?overview=full&geometries=geojson&alternatives=2&steps=true`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes?.length) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.routes.map((r: any) => ({
    distanceKm: r.distance / 1000,
    durationMin: Math.round(r.duration / 60),
    coords: r.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
    ),
    steps: r.legs?.[0]?.steps ?? [],
  }));
}

// ── FlyTo ─────────────────────────────────────────────────────────────────────
function FlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const cur = map.getCenter();
    if (cur.distanceTo(L.latLng(center[0], center[1])) > 20) {
      map.flyTo(center, 13, { duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

// ── MapEvents ─────────────────────────────────────────────────────────────────
function MapEvents({
  onCenterChange,
  onDeselect,
}: {
  onCenterChange: (c: [number, number]) => void;
  onDeselect: () => void;
}) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter();
      onCenterChange([c.lat, c.lng]);
    },
    click: () => onDeselect(),
  });
  return null;
}

// ── FitBounds helper (inside map) ─────────────────────────────────────────────
function FitRoute({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length < 2) return;
    map.fitBounds(L.latLngBounds(coords), { padding: [80, 80], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);
  return null;
}

// ── Popup Card ────────────────────────────────────────────────────────────────
function StationPopupCard({
  station,
  navigate,
  userLocation,
  onDirections,
  isMyStation,
}: {
  station: Station;
  navigate: NavigateFn;
  userLocation?: [number, number] | null;
  onDirections: (s: Station) => void;
  isMyStation?: boolean;
}) {
  const [roadDist, setRoadDist] = useState<number | null>(null);

  useEffect(() => {
    if (!userLocation) return;
    const [sLng, sLat] = station.location.coordinates;
    fetchRoutes(userLocation, [sLat, sLng], "driving")
      .then((routes) => {
        if (routes.length > 0) {
          setRoadDist(routes[0].distanceKm);
        }
      })
      .catch(() => {});
  }, [userLocation, station.location.coordinates]);

  const displayDist = roadDist !== null ? roadDist : station.distanceKm;
  const isOpenNow = isStationOpenNow(station);
  const isClosed = !isOpenNow;
  const avail = isOpenNow && station.availablePorts > 0;
  const minPrice = station.pricing?.length
    ? Math.min(...station.pricing.map((p) => p.priceperKWh))
    : 0;
  const sym = station.pricing?.[0]?.currency === "INR" ? "₹" : "$";
  const avgRating = station.reviews?.length
    ? (station.reviews.reduce((a, r) => a + r.rating, 0) / station.reviews.length).toFixed(1)
    : null;
  const bgHeader = isClosed ? "#94A3B8" : avail ? "#4A6163" : "#C64F38";

  return (
    <div
      style={{
        width: 258,
        fontFamily: "'Inter', sans-serif",
        borderRadius: "4px",
        overflow: "hidden",
        background: "#FAF9F6",
        border: "1px solid #D1D1D1",
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          background: bgHeader,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "2px",
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          {station.Images?.[0] ? (
            <img
              src={station.Images[0]}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <FontAwesomeIcon
              icon={faChargingStation}
              style={{ width: 15, height: 15, color: "white" }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 750,
              color: "#ffffff",
              fontSize: "12px",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            {station.name}
          </p>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "10px", margin: 0, fontWeight: 500 }}>
            {station.address?.city} • {station.openingHours || "24/7"}
          </p>
        </div>
        <span
          style={{
            background: "#FAF9F6",
            color: bgHeader,
            borderRadius: "2px",
            padding: "2px 6px",
            fontSize: "9px",
            fontWeight: 800,
            flexShrink: 0,
            border: "1px solid rgba(255,255,255,0.3)",
            textTransform: "uppercase",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.02em",
          }}
        >
          {avail ? `${station.availablePorts} FREE` : station.isOpen ? "FULL" : "CLOSED"}
        </span>
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid #D1D1D1", background: "#ffffff" }}>
        <div
          style={{
            flex: 1,
            padding: "8px 4px",
            textAlign: "center",
            borderRight: "1px solid #D1D1D1",
          }}
        >
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, color: "#C64F38", fontSize: "13px", margin: 0 }}>
            {sym}
            {minPrice}
          </p>
          <p style={{ color: "#4A6163", fontSize: "9px", margin: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>per kWh</p>
        </div>
        {avgRating && (
          <div
            style={{
              flex: 1,
              padding: "8px 4px",
              textAlign: "center",
              borderRight: "1px solid #D1D1D1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 800,
                color: "#242426",
                fontSize: "13px",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Star size={10} fill="#C64F38" color="#C64F38" />
              {avgRating}
            </p>
            <p style={{ color: "#4A6163", fontSize: "9px", margin: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>rating</p>
          </div>
        )}
        {displayDist !== undefined && (
          <div style={{ flex: 1, padding: "8px 4px", textAlign: "center" }}>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, color: "#242426", fontSize: "13px", margin: 0 }}>
              {displayDist < 1
                ? `${(displayDist * 1000).toFixed(0)}m`
                : `${displayDist.toFixed(1)}km`}
            </p>
            <p style={{ color: "#4A6163", fontSize: "9px", margin: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {roadDist !== null ? "by road" : "away"}
            </p>
          </div>
        )}
      </div>
      <div
        style={{
          padding: 10,
          display: "grid",
          gridTemplateColumns: isMyStation ? "1fr" : "1fr 1fr",
          gap: 8,
          background: "#FAF9F6",
        }}
      >
        {isMyStation ? (
          <button
            onClick={() =>
              navigate({ to: "/owner/stations/$stationId", params: { stationId: station._id } })
            }
            style={{
              height: 32,
              background: "#242426",
              color: "#FAF9F6",
              border: "none",
              borderRadius: "4px",
              fontWeight: 800,
              fontSize: "10px",
              fontFamily: "'Space Grotesk', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "background 0.2s ease",
            }}
          >
            Bookings Dashboard
          </button>
        ) : (
          <>
            <button
              disabled={!station.isOpen}
              onClick={() =>
                navigate({ to: "/stations/$stationId", params: { stationId: station._id } })
              }
              style={{
                height: 32,
                background: station.isOpen ? "#242426" : "#EAEAEA",
                color: station.isOpen ? "#FAF9F6" : "#94A3B8",
                border: "none",
                borderRadius: "4px",
                fontWeight: 800,
                fontSize: "10px",
                fontFamily: "'Space Grotesk', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                cursor: station.isOpen ? "pointer" : "not-allowed",
                transition: "background 0.2s ease",
              }}
            >
              Book Now
            </button>
            <button
              onClick={() => {
                if (userLocation) {
                  onDirections(station);
                } else {
                  toast.error("Waiting for GPS location to calculate directions");
                }
              }}
              style={{
                height: 32,
                border: "1px solid #D1D1D1",
                borderRadius: "4px",
                background: "#ffffff",
                fontSize: "10px",
                fontFamily: "'Space Grotesk', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontWeight: 800,
                color: "#4A6163",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                transition: "background 0.2s ease",
              }}
            >
              <Navigation size={10} /> Directions
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Station Marker ────────────────────────────────────────────────────────────
function StationMarker({
  station,
  isSelected,
  onSelect,
  navigate,
  userLocation,
  onDirections,
  isMyStation,
}: {
  station: Station;
  isSelected: boolean;
  onSelect: (s: Station) => void;
  navigate: NavigateFn;
  userLocation?: [number, number] | null;
  onDirections: (s: Station) => void;
  isMyStation?: boolean;
}) {
  const [lng, lat] = station.location.coordinates;
  const avail = station.isOpen && station.availablePorts > 0;
  const markerRef = useRef<L.Marker | null>(null);
  const [hovering, setHovering] = useState(false);
  const isTouch = useRef(false);
  const active = isTouch.current ? isSelected : hovering || isSelected;
  const icon = useMemo(() => makeStationIcon(avail, active, !station.isOpen), [avail, active, station.isOpen]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (isSelected) {
      const t = setTimeout(() => marker.openPopup(), 350);
      return () => clearTimeout(t);
    } else {
      marker.closePopup();
      setHovering(false);
    }
  }, [isSelected]);

  return (
    <Marker
      ref={(m) => {
        markerRef.current = m;
      }}
      position={[lat, lng]}
      icon={icon}
      eventHandlers={{
        mouseover: (e) => {
          if ((e.originalEvent as PointerEvent).pointerType === "touch") return;
          setHovering(true);
          markerRef.current?.openPopup();
        },
        mouseout: (e) => {
          if ((e.originalEvent as PointerEvent).pointerType === "touch") return;
          setHovering(false);
        },
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          isTouch.current = (e.originalEvent as PointerEvent).pointerType === "touch";
          setHovering(false);
          onSelect(station);
        },
      }}
    >
      <Popup
        className="ev-station-popup"
        closeButton={false}
        autoPan={false}
        keepInView={false}
        minWidth={258}
        maxWidth={258}
        offset={[0, -10]}
      >
        <StationPopupCard
          station={station}
          navigate={navigate}
          userLocation={userLocation}
          onDirections={onDirections}
          isMyStation={isMyStation}
        />
      </Popup>
    </Marker>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StationsMapInner({
  center,
  stations,
  onSelect,
  onDeselect,
  selectedId,
  onCenterChange,
  userLocation,
  navigate,
}: {
  center: [number, number];
  stations: Station[];
  onSelect: (s: Station) => void;
  onDeselect: () => void;
  selectedId?: string | null;
  onCenterChange?: (c: [number, number]) => void;
  userLocation?: [number, number] | null;
  navigate: NavigateFn;
}) {
  const { user } = useAuth();
  const mapRef = useRef<L.Map | null>(null);

  // ── Routing state ──
  const [targetStation, setTargetStation] = useState<Station | null>(null);
  const [mode, setMode] = useState<TransportMode>("driving");
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [panelVisible, setPanelVisible] = useState(true);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const handleDirections = useCallback((station: Station) => {
    setTargetStation(station);
    setRoutes([]);
    setSelectedRouteIdx(0);
    setRouteLoading(true);
    setPanelVisible(true);
    setCurrentStepIdx(0);
  }, []);

  const clearRoute = useCallback(() => {
    setTargetStation(null);
    setRoutes([]);
    setRouteLoading(false);
    setPanelVisible(true);
    setCurrentStepIdx(0);
  }, []);

  const userLocRef = useRef<[number, number] | null>(userLocation ?? null);
  useEffect(() => {
    userLocRef.current = userLocation ?? null;
  }, [userLocation]);

  const handleStart = useCallback(() => {
    setPanelVisible(false);
    setCurrentStepIdx(0);
    const loc = userLocRef.current;
    if (loc && mapRef.current) {
      mapRef.current.flyTo(loc, 17, { duration: 1.2 });
    }
  }, []);

  const lastPanLocRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!panelVisible && targetStation && userLocation && mapRef.current) {
      const prev = lastPanLocRef.current;
      const moved =
        !prev ||
        Math.abs(userLocation[0] - prev[0]) > 0.00009 ||
        Math.abs(userLocation[1] - prev[1]) > 0.00013;
      if (moved) {
        lastPanLocRef.current = userLocation;
        mapRef.current.panTo(userLocation, { animate: true, duration: 1 });
      }

      const selectedRoute = routes[selectedRouteIdx];
      if (selectedRoute && selectedRoute.steps.length > 0) {
        const nextStep =
          selectedRoute.steps[Math.min(currentStepIdx + 1, selectedRoute.steps.length - 1)];
        if (nextStep && nextStep.maneuver.location) {
          const [lng, lat] = nextStep.maneuver.location;
          const distToManeuver = L.latLng(userLocation[0], userLocation[1]).distanceTo(
            L.latLng(lat, lng),
          );
          if (distToManeuver < 30 && currentStepIdx < selectedRoute.steps.length - 1) {
            setCurrentStepIdx((i) => i + 1);
          }
        }
      }
    }
  }, [userLocation, panelVisible, targetStation, routes, selectedRouteIdx, currentStepIdx]);

  useEffect(() => {
    const pendingId = sessionStorage.getItem("pendingDirections");
    if (pendingId && stations.length > 0 && userLocation) {
      const s = stations.find((x) => x._id === pendingId);
      if (s) {
        sessionStorage.removeItem("pendingDirections");
        handleDirections(s);
      }
    }
  }, [stations, userLocation, handleDirections]);

  useEffect(() => {
    if (!targetStation) return;
    const loc = userLocRef.current;
    if (!loc) return;
    let cancelled = false;
    setRouteLoading(true);
    setRoutes([]);
    setSelectedRouteIdx(0);
    const [sLng, sLat] = targetStation.location.coordinates;
    fetchRoutes(loc, [sLat, sLng], mode)
      .then((r) => {
        if (!cancelled) {
          setRoutes(r);
          setRouteLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setRouteLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetStation, mode]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const s = stations.find((x) => x._id === selectedId);
    if (s) {
      const [lng, lat] = s.location.coordinates;
      mapRef.current.flyTo([lat, lng], 15, { duration: 0.6 });
    }
  }, [selectedId, stations]);

  const selectedRoute = routes[selectedRouteIdx];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full"
        ref={(m) => {
          mapRef.current = m;
        }}
        zoomControl={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo center={center} />
        {onCenterChange && <MapEvents onCenterChange={onCenterChange} onDeselect={onDeselect} />}

        {userLocation && <Marker position={userLocation} icon={userIcon} />}

        {routes.map(
          (r, i) =>
            i !== selectedRouteIdx && (
              <Polyline
                key={`alt-${i}`}
                positions={r.coords}
                color="#A8A8A8"
                weight={3}
                opacity={0.7}
                dashArray="6 4"
              />
            ),
        )}

        {selectedRoute && (
          <>
            <Polyline positions={selectedRoute.coords} color="#242426" weight={8} opacity={0.15} />
            <Polyline positions={selectedRoute.coords} color="#242426" weight={4} opacity={0.95} />
            <Polyline
              positions={selectedRoute.coords}
              color="#C64F38"
              weight={2}
              opacity={0.9}
              dashArray="6 6"
            />
            {panelVisible && <FitRoute coords={selectedRoute.coords} />}
          </>
        )}

        {targetStation &&
          (() => {
            const [lng, lat] = targetStation.location.coordinates;
            return <Marker position={[lat, lng]} icon={destIcon} />;
          })()}

        {stations.map((s) => {
          const isMyStation = !!(
            s &&
            user &&
            (typeof s.ownerofStation === "string"
              ? s.ownerofStation === user.id
              : s.ownerofStation?._id === user.id)
          );
          return (
            <StationMarker
              key={s._id}
              station={s}
              isSelected={selectedId === s._id}
              onSelect={onSelect}
              navigate={navigate}
              userLocation={userLocation}
              onDirections={handleDirections}
              isMyStation={isMyStation}
            />
          );
        })}
      </MapContainer>

      {targetStation && userLocation && panelVisible && (
        <DirectionsPanel
          station={targetStation}
          userLocation={userLocation}
          mode={mode}
          onModeChange={(m) => setMode(m)}
          routes={routes}
          selectedIdx={selectedRouteIdx}
          onSelectRoute={setSelectedRouteIdx}
          loading={routeLoading}
          onClose={clearRoute}
          onStart={handleStart}
        />
      )}

      {targetStation &&
        selectedRoute &&
        userLocation &&
        !panelVisible &&
        (() => {
          const nextStep =
            selectedRoute.steps[Math.min(currentStepIdx + 1, selectedRoute.steps.length - 1)] ||
            selectedRoute.steps[0];
          const distToNext = nextStep?.maneuver?.location
            ? L.latLng(userLocation[0], userLocation[1]).distanceTo(
                L.latLng(nextStep.maneuver.location[1], nextStep.maneuver.location[0]),
              ) / 1000
            : nextStep?.distance / 1000 || 0;

          return (
            <>
              <div
                style={{
                  position: "fixed",
                  top: "calc(env(safe-area-inset-top, 0px) + 72px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 99999,
                  background: "#FAF9F6",
                  border: "1px solid #D1D1D1",
                  borderRadius: "4px",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  width: "min(90vw, 400px)",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "4px",
                    background: "#242426",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FAF9F6",
                    fontSize: 20,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {stepIcon(nextStep.maneuver.type, nextStep.maneuver.modifier)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#242426", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {fmtDist(distToNext)}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#4A6163",
                      marginTop: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {stepLabel(nextStep.maneuver.type, nextStep.maneuver.modifier, nextStep.name)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: "fixed",
                  bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 99999,
                  background: "#FAF9F6",
                  border: "1px solid #D1D1D1",
                  borderRadius: "4px",
                  padding: "8px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  whiteSpace: "nowrap",
                  width: "max-content",
                  maxWidth: "calc(100vw - 24px)",
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#C64F38",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 800, color: "#242426" }}>
                  {selectedRoute.durationMin < 60
                    ? `${selectedRoute.durationMin} min`
                    : `${Math.floor(selectedRoute.durationMin / 60)}h ${selectedRoute.durationMin % 60}m`}
                </span>
                <span style={{ fontSize: 11, color: "#4A6163", fontFamily: "'Inter', sans-serif" }}>
                  {selectedRoute.distanceKm < 1
                    ? `${(selectedRoute.distanceKm * 1000).toFixed(0)} m`
                    : `${selectedRoute.distanceKm.toFixed(1)} km`}
                </span>
                <button
                  onClick={() => setPanelVisible(true)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #D1D1D1",
                    borderRadius: "2px",
                    padding: "3px 8px",
                    cursor: "pointer",
                    color: "#4A6163",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Details
                </button>
                <button
                  onClick={clearRoute}
                  style={{
                    background: "#C64F38",
                    border: "none",
                    borderRadius: "2px",
                    padding: "4px 9px",
                    cursor: "pointer",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  ✕ End
                </button>
              </div>
            </>
          );
        })()}
    </div>
  );
}
