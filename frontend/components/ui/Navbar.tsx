"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { HoloLogo } from "./HoloLogo";
import {
  Bell,
  User,
  BrainCircuit,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Activity,
  LayoutDashboard,
  Map,
  MonitorPlay,
  History,
  Scale,
  Download,
  ShieldCheck,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Nav link icons map ────────────────────────────────────────────────────────
const LINK_ICONS: Record<string, any> = {
  home:       Home,
  public:     Activity,
  dashboard:  LayoutDashboard,
  zones:      Map,
  monitoring: MonitorPlay,
  historical: History,
  legal:      Scale,
  export:     Download,
  admin:      ShieldCheck,
};

// ── Main Component ────────────────────────────────────────────────────────────
export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [mlOnline, setMlOnline]           = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [userMenuOpen, setUserMenuOpen]   = useState(false);
  const [scrolled, setScrolled]           = useState(false);
  const pathname                          = usePathname();
  const { scrollY }                       = useScroll();
  const userMenuRef                       = useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 10));

  // ML health check
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch("http://localhost:5000/api/scan/health", {
          signal: AbortSignal.timeout(3000),
        });
        setMlOnline(r.ok);
      } catch {
        setMlOnline(false);
      }
    };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const publicLinks = [
    { id: "home",   label: "Home",          href: "/" },
    { id: "public", label: "Public Portal", href: "/public" },
  ];
  const authLinks = [
    { id: "dashboard",  label: "Dashboard",    href: "/dashboard" },
    { id: "zones",      label: "Zones",        href: "/zones" },
    { id: "monitoring", label: "Monitoring",   href: "/monitoring" },
    { id: "historical", label: "Historical",   href: "/historical" },
    { id: "legal",      label: "Legal",        href: "/legal" },
    { id: "export",     label: "Export",       href: "/export" },
  ];
  if (user?.role === "admin")
    authLinks.push({ id: "admin", label: "Admin", href: "/admin" });

  const links = isAuthenticated ? authLinks : publicLinks;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 px-4 pt-6 flex justify-center pointer-events-none">

      {/* ─── Glassmorphism Bar ────────────────────────────────────────────── */}
      <motion.div
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative w-full max-w-[95%] 2xl:max-w-7xl mx-auto flex items-center justify-between",
          "rounded-[24px] pointer-events-auto",
          "transition-all duration-500"
        )}
        style={{
          background: "rgba(5, 11, 25, 0.8)", // Deep dark blue background
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(59, 130, 246, 0.25)", // Subtle blue border
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Glow effect matching the image's top edge */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        {/* ── SECTION A: Brand ── */}
        <div className="flex items-center pl-6 py-3 pr-4 shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <HoloLogo />
            <div className="flex flex-col leading-tight">
              <span className="text-[17px] font-bold tracking-tight text-white">
                Eco<span className="text-blue-500">Watch</span>
              </span>
              <span className="text-[10px] text-blue-500 uppercase tracking-[0.2em] font-bold">
                Orbital Intel
              </span>
            </div>
          </Link>
        </div>

        {/* Vertical divider */}
        <div className="hidden lg:block w-px h-8 bg-white/10 shrink-0 mx-2" />

        {/* ── SECTION B: Nav Links (desktop) ── */}
        <div className="hidden lg:flex flex-1 items-center justify-center px-2 gap-1 h-full min-h-[56px]">
          {links.map((link) => {
            const Icon = LINK_ICONS[link.id] ?? Activity;
            const active = isActive(link.href);
            return (
              <Link
                key={link.id}
                href={link.href}
                className={cn(
                  "group relative flex items-center h-full gap-2 px-4 py-4 text-[11px] font-bold uppercase tracking-wider transition-colors duration-200 select-none",
                  active
                    ? "text-blue-500"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Icon
                  size={14}
                  className={cn(
                    "relative z-10 shrink-0 transition-colors",
                    active ? "text-blue-500" : "text-zinc-400 group-hover:text-zinc-200"
                  )}
                />
                <span className="relative z-10 whitespace-nowrap">{link.label}</span>

                {/* Active borders (top and bottom) */}
                {active && (
                  <>
                    <motion.div
                      layoutId="navTop"
                      className="absolute top-0 left-0 right-0 h-[3px] rounded-b-sm bg-blue-500 shadow-[0_0_12px_#3b82f6]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                    <motion.div
                      layoutId="navBottom"
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-sm bg-blue-500 shadow-[0_0_12px_#3b82f6]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {/* Vertical divider */}
        <div className="hidden lg:block w-px h-8 bg-white/10 shrink-0 mx-2" />

        {/* ── SECTION C: Right Controls ── */}
        <div className="flex items-center gap-4 pr-4 py-3 shrink-0">

          {/* ML Status */}
          {isAuthenticated && mlOnline !== null && (
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/40 bg-blue-500/5 text-[10px] font-bold uppercase tracking-widest text-blue-500"
            >
              <BrainCircuit size={13} />
              <span>{mlOnline ? "AI Online" : "AI Offline"}</span>
              <span className="relative flex h-2 w-2 ml-1">
                {mlOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />}
                <span className={cn("relative inline-flex rounded-full h-2 w-2", mlOnline ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : "bg-red-500")} />
              </span>
            </div>
          )}

          {/* Not authenticated → Sign In + Get Access */}
          {!isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link href="/auth">
                <span className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer uppercase tracking-wider">
                  Sign In
                </span>
              </Link>
              <Link href="/auth?tab=register">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 py-2 rounded-full border border-blue-500/50 bg-blue-500/20 text-blue-400 text-[11px] font-bold uppercase tracking-wider hover:bg-blue-500/30 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                >
                  Get Access
                </motion.button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {/* Bell */}
              <button
                className="relative text-zinc-400 hover:text-white transition-colors"
              >
                <Bell size={18} />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_6px_#3b82f6]" />
              </button>

              {/* User dropdown */}
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen((p) => !p)}
                  className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-2xl hover:bg-white/5 transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-[10px] bg-[#0c1f38] flex items-center justify-center shrink-0 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                  >
                    <User size={16} className="text-blue-500" />
                  </div>

                  {/* User info */}
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">
                      {user?.role || "Analyst"}
                    </span>
                    <span className="text-[12px] text-white font-semibold">
                      {user?.name?.split(" ")[0] || "nikhil"}
                    </span>
                  </div>

                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-zinc-500 transition-transform duration-200 hidden sm:block",
                      userMenuOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-full mt-3 w-56 rounded-2xl overflow-hidden pointer-events-auto"
                      style={{
                        background: "rgba(3, 7, 18, 0.95)",
                        backdropFilter: "blur(32px)",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                      }}
                    >
                      <div className="px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[10px] bg-[#0c1f38] border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)] flex items-center justify-center shrink-0">
                            <User size={16} className="text-blue-500" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] text-white font-semibold truncate">
                              {user?.name || "User"}
                            </span>
                            <span className="text-[10px] text-zinc-500 truncate mt-0.5">
                              {user?.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-1.5">
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-[12px] font-medium transition-colors group"
                        >
                          <LogOut size={14} className="text-red-400" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((p) => !p)}
            className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all pointer-events-auto"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mobileOpen ? "x" : "menu"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {mobileOpen ? <X size={16} /> : <Menu size={16} />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </motion.div>

      {/* ─── Mobile Menu ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-4 right-4 top-24 rounded-2xl overflow-hidden pointer-events-auto"
            style={{
              background: "rgba(3, 7, 18, 0.95)",
              backdropFilter: "blur(32px)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            <div className="p-2">
              {links.map((link) => {
                const Icon = LINK_ICONS[link.id] ?? Activity;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all",
                      active
                        ? "text-blue-500 bg-blue-500/10 border border-blue-500/20"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon size={16} className={active ? "text-blue-500" : "text-zinc-600"} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
            {isAuthenticated && (
              <>
                <div className="h-px bg-white/5 mx-2" />
                <div className="p-2">
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
