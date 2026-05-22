import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Map, Calendar, User, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const loc = useLocation();
  const { isOwner, isAuthed } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (loc.pathname.startsWith("/auth")) return null;
  if (!isAuthed) return null;

  const navItems = [
    { to: "/", label: "Map", icon: Map },
    ...(!isOwner ? [{ to: "/bookings", label: "Bookings", icon: Calendar }] : []),
    ...(isOwner ? [{ to: "/owner", label: "Owner", icon: LayoutDashboard }] : []),
    { to: "/profile", label: "Profile", icon: User },
  ];

  const totalCols = navItems.length;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[1000] bg-white border-t border-[#D1D1D1] shadow-lg"
      style={{ paddingBottom: "var(--safe-bottom)", fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className={cn("max-w-2xl mx-auto grid px-2")}
        style={{ gridTemplateColumns: `repeat(${totalCols}, 1fr)` }}
      >
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold transition-colors",
                active ? "text-[#C64F38]" : "text-[#4A6163] hover:text-[#242426]",
              )}
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-[4px] flex items-center justify-center transition-all",
                  active && "bg-[#FBE8E4] border border-[#FBDED9]",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-space uppercase tracking-wider">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
