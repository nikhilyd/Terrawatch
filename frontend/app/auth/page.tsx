"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, CheckCircle2, ShieldAlert, Leaf, Lock, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Form Component ──────────────────────────────────────────────────────────
function AuthForm() {
  const { login, register, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      if (activeTab === "login") {
        const res = await login(email, password);
        if (!res.success) setError(res.message || "Login failed");
      } else {
        const res = await register(name, email, password);
        if (!res.success) setError(res.message || "Registration failed");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3D Tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useTransform(useSpring(my, { stiffness: 300, damping: 30 }), [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(useSpring(mx, { stiffness: 300, damping: 30 }), [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-blue-500/5 focus:shadow-[0_0_20px_rgba(59, 130, 246,0.15)] transition-all duration-200";

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      className="w-full"
    >
      <div
        className="glass-strong rounded-3xl p-8 relative overflow-hidden"
        style={{ transform: "translateZ(30px)" }}
      >
        {/* Scan line animation */}
        <motion.div
          animate={{ y: ["-120%", "300%"] }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear", repeatDelay: 2 }}
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none"
        />

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl glass mb-8">
          {(["login", "register"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveTab(tab); setError(""); }}
              className={cn(
                "flex-1 py-2 px-4 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all duration-200",
                activeTab === tab
                  ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59, 130, 246,0.3)]"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm"
            >
              <ShieldAlert size={15} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forms */}
        <AnimatePresence mode="wait">
          {activeTab === "login" ? (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-5"
            >
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  <Mail size={10} /> Officer Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="agent@ecowatch.gov"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  <Lock size={10} /> Passcode
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••••"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="btn-shimmer mt-2 w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_25px_rgba(59, 130, 246,0.35)] disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Access System <ArrowRight size={16} /></>}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              key="register"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  <User size={10} /> Full Name
                </label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Agent Name" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  <Mail size={10} /> Email
                </label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="agent@ecowatch.gov" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  <Lock size={10} /> Passcode
                </label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••••" />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="btn-shimmer mt-1 w-full glass-blue text-blue-400 hover:text-white font-semibold text-sm uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-blue-500 hover:shadow-[0_0_25px_rgba(59, 130, 246,0.35)] disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Initialize Agent <CheckCircle2 size={16} /></>}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AuthPage() {
  return (
    <div className="min-h-screen fixed inset-0 flex items-center justify-center overflow-hidden">
      {/* Extra overlay for auth page depth */}
      <div className="absolute inset-0 bg-[#030712]/60 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center px-6 max-w-6xl mx-auto h-full">

        {/* Header/Logo (Centered above the split) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mt-16 mb-10 text-center"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-12 h-12 rounded-2xl glass-blue flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Leaf size={24} className="text-blue-400" />
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">
              Eco<span className="text-blue-400">Watch</span>
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-blue">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">
              Secure Uplink Established
            </span>
          </div>
          <h1 className="mt-6 text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Orbital <span className="text-gradient-eco">Defense Matrix</span>
          </h1>
        </motion.div>

        {/* 50/50 Split Container */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-stretch max-w-5xl">

          {/* Left side: Satellite Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex"
          >
            <div className="relative w-full rounded-[32px] overflow-hidden border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.15)] group flex-1 min-h-[400px]">
              <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-transparent transition-colors duration-500 z-10 mix-blend-overlay pointer-events-none" />
              <video
                src="https://res.cloudinary.com/dln9cvymf/video/upload/v1784898368/convert_this_image_into_video_s8yvuo.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Corner tech accents */}
              <div className="absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 border-blue-400/50 z-20 rounded-tl-xl" />
              <div className="absolute top-5 right-5 w-8 h-8 border-t-2 border-r-2 border-blue-400/50 z-20 rounded-tr-xl" />
              <div className="absolute bottom-5 left-5 w-8 h-8 border-b-2 border-l-2 border-blue-400/50 z-20 rounded-bl-xl" />
              <div className="absolute bottom-5 right-5 w-8 h-8 border-b-2 border-r-2 border-blue-400/50 z-20 rounded-br-xl" />
            </div>
          </motion.div>

          {/* Right side: Auth Form */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex items-center justify-center [perspective:1000px]"
          >
            <Suspense fallback={
              <div className="w-full h-full glass-strong rounded-[32px] p-10 flex items-center justify-center text-blue-400 font-medium animate-pulse border border-blue-500/20">
                Initializing Interface...
              </div>
            }>
              <div className="w-full h-full flex flex-col justify-center">
                <AuthForm />
              </div>
            </Suspense>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
