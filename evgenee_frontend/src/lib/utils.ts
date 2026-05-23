import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n: number, currency: string = "INR") {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function getApiError(e: unknown, fallback = "Something went wrong") {
  if (typeof e === "object" && e && "response" in e) {
    // @ts-expect-error axios shape
    const data = e.response?.data;
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((err: any) => err.message).join(", ");
    }
    return data?.message || fallback;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export function isStationOpenNow(station: { isOpen: boolean; openingHours?: string | null }) {
  if (!station.isOpen) return false;
  const openingHours = station.openingHours?.trim();
  if (!openingHours) return true;

  const match = openingHours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) return true;

  const [_, startStr, endStr] = match;
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
  const timePart = istString.split(",").pop()?.trim() ?? "00:00";
  const [curH, curM] = timePart.split(":").map(Number);
  const currentMinutes = curH * 60 + curM;

  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}
