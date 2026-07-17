"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HoloLogo } from "./HoloLogo";
import { Bell, User, Orbit, ChevronDown, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

// Example state: toggle this to see Auth vs Public
export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("mission");
  const [mlOnline, setMlOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkML = async () => {
      try {
        const res = await fetch("http://localhost:8001/api/health", { signal: AbortSignal.timeout(3000) });
        setMlOnline(res.ok);
      } catch {
        setMlOnline(false);
      }
    };
    checkML();
    const interval = setInterval(checkML, 15000);
    return () => clearInterval(interval);
  }, []);

  const publicLinks = [
    { id: "public", label: "Public Portal", href: "/public" },
  ];

  const authLinks = [
    { id: "dashboard",   label: "Command Center", href: "/dashboard" },
    { id: "zones",       label: "Mission Control", href: "/zones" },
    { id: "monitoring",  label: "Monitoring",      href: "/monitoring" },
    { id: "historical",  label: "Historical",      href: "/historical" },
    { id: "legal",       label: "Legal",           href: "/legal" },
    { id: "export",      label: "Data Export",     href: "/export" },
  ];

  if (user?.role === 'admin') {
    authLinks.push({ id: "admin", label: "Admin", href: "/admin" });
  }

  const links = isAuthenticated ? authLinks : publicLinks;

  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl px-6 py-3 flex items-center justify-between shadow-[0_0_40px_rgba(16,185,129,0.1)] relative overflow-hidden"
      >
        {/* Radar scanning line effect in background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="w-1/2 h-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent skew-x-12"
          />
        </div>

        {/* Left: Logo */}
        <div className="flex items-center gap-3 relative z-10 cursor-default">
          <HoloLogo />
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-widest text-white flex items-center gap-1">
              ECO<span className="text-emerald-400">WATCH</span>
            </span>
            <span className="text-[10px] text-emerald-500/80 uppercase tracking-[0.2em] font-mono leading-none">
              Orbital Intel
            </span>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <div className="hidden lg:flex items-center gap-1 relative z-10">
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              onClick={() => setActiveTab(link.id)}
              className={cn(
                "relative px-4 py-2 text-sm font-medium transition-colors hover:text-emerald-300",
                activeTab === link.id ? "text-emerald-400" : "text-zinc-400"
              )}
            >
              {activeTab === link.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 uppercase tracking-wider text-[10px] md:text-xs font-mono">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4 relative z-10">
          {!isAuthenticated ? (
            <>
              {/* Public Actions */}
              <Link href="/auth/login">
                <button className="text-xs font-mono uppercase tracking-widest text-zinc-300 hover:text-white transition-colors relative group">
                  Login
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-emerald-500 transition-all group-hover:w-full" />
                </button>
              </Link>
              
              <Link href="/public">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group px-5 py-2 overflow-hidden rounded-none bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-500/30 transition-all hidden sm:flex"
                  style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)" }}
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-emerald-400/0 via-emerald-400/30 to-emerald-400/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <span className="relative text-xs font-mono uppercase tracking-widest text-emerald-300 group-hover:text-emerald-100 font-bold flex items-center gap-2">
                    <Orbit size={14} className="animate-spin-slow" />
                    Enter Portal
                  </span>
                </motion.button>
              </Link>
            </>
          ) : (
            <>
              {/* Auth Actions */}
              {/* ML Service Status */}
              {mlOnline !== null && (
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full border border-white/10 bg-black/20">
                  <BrainCircuit size={12} className={mlOnline ? "text-emerald-400" : "text-red-400"} />
                  <span className={`text-[9px] font-mono uppercase tracking-widest ${mlOnline ? "text-emerald-400" : "text-red-400"}`}>
                    {mlOnline ? "ML Online" : "ML Offline"}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${mlOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                </div>
              )}

              <button className="relative p-2 text-zinc-400 hover:text-emerald-400 transition-colors hidden sm:block">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              
              <div 
                className="flex items-center gap-2 group p-1 pr-3 rounded-full border border-white/5 bg-black/20"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-500/30 group-hover:bg-emerald-800/50 transition-colors">
                  <User size={16} className="text-emerald-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono leading-none">{user?.role || 'Officer'}</span>
                  <span className="text-xs text-white font-medium flex items-center gap-1">
                    {user?.name?.split(' ')[0] || 'User'} <ChevronDown size={12} className="text-zinc-500" />
                  </span>
                </div>
              </div>

              <button 
                onClick={logout}
                className="px-3 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-mono uppercase tracking-widest transition-colors border border-red-500/30"
              >
                Logout
              </button>

            </>
          )}
        </div>
      </motion.div>
    </nav>
  );
}
