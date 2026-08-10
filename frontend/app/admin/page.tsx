"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { ShieldCheck, UserCog, UserMinus, ShieldAlert, Loader2, Save } from "lucide-react";
import { usersService } from "@/lib/api/users";
import { User, UserRole } from "@/types/user.types";
import { useAuth } from "@/context/AuthContext";

export default function AdminPortal() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // My Notify Prefs State
  const [myPrefs, setMyPrefs] = useState({
    critical: true, high: true, medium: false, low: false, digest: true
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    const res = await usersService.getAllUsers();
    if (res.success) {
      setUsers(res.data);
      // find my own prefs
      if (currentUser) {
        const me = res.data.find(u => u._id === currentUser.id);
        if (me && me.notifyOn) {
          setMyPrefs(me.notifyOn);
        }
      }
    }
    setIsLoading(false);
  };

  const handleRoleChange = async (id: string, newRole: UserRole) => {
    const toastId = toast.loading("Updating access level...");
    const res = await usersService.updateUserRole(id, newRole);
    
    if (res.success) {
      toast.success(res.message || "Role updated", { id: toastId });
      setUsers(users.map(u => u._id === id ? { ...u, role: newRole } : u));
    } else {
      toast.error(res.message || "Failed to update role", { id: toastId });
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    const confirm = window.confirm(`CRITICAL: Are you sure you want to permanently terminate access for ${name}?`);
    if (!confirm) return;

    setDeletingId(id);
    const toastId = toast.loading("Terminating user access...");
    
    const res = await usersService.deleteUser(id);
    
    if (res.success) {
      toast.success(`${name}'s access has been terminated.`, { id: toastId });
      setUsers(users.filter(u => u._id !== id));
    } else {
      toast.error(res.message || "Failed to delete user", { id: toastId });
    }
    setDeletingId(null);
  };

  const handleSavePrefs = async () => {
    setIsSavingPrefs(true);
    const res = await usersService.updateNotifyPrefs(myPrefs);
    if (res.success) {
      toast.success("Notification preferences saved successfully");
    } else {
      toast.error("Failed to save preferences");
    }
    setIsSavingPrefs(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "analyst": return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
      case "field": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-2xl flex flex-col items-center max-w-md text-center">
          <ShieldAlert size={64} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Clearance Required</h1>
          <p className="text-sm text-zinc-400">
            You do not have Level-4 Admin Clearance to view the Personnel Roster. This incident has been logged.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pt-24 px-4 md:px-6 pb-20 overflow-hidden relative selection:bg-cyan-500/30">
      <Toaster position="top-right" theme="dark" />
      
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.1),transparent_70%)] pointer-events-none" />

      <div className="container mx-auto max-w-6xl relative z-10">
        
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono text-red-500 tracking-widest uppercase">Restricted Area</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 flex items-center gap-4">
            <ShieldCheck size={40} className="text-white/50" /> Personnel & Security
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl font-light leading-relaxed">
            Manage system access, assign operational roles to field rangers and data analysts, and update your personal secure comms preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Roster Table */}
          <div className="lg:col-span-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.05)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCog size={20} className="text-zinc-400" /> Active Roster
                </h2>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Global System Users</p>
              </div>
              <span className="text-xs font-mono bg-white/5 px-3 py-1 rounded border border-white/5">
                {users.length} Users
              </span>
            </div>

            {isLoading ? (
               <div className="flex justify-center py-20">
                 <Loader2 className="animate-spin text-red-500" size={32} />
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      <th className="py-4 pl-4 font-normal">Personnel</th>
                      <th className="py-4 font-normal">Clearance Level</th>
                      <th className="py-4 font-normal text-right pr-4">Admin Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {users.map((user) => {
                        const isMe = currentUser?.id === user._id;
                        return (
                          <motion.tr 
                            key={user._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                          >
                            <td className="py-4 pl-4">
                              <div className="font-medium text-sm text-white flex items-center gap-2">
                                {user.name} {isMe && <span className="text-[10px] bg-white/10 px-1 rounded text-zinc-400 font-mono">(You)</span>}
                              </div>
                              <div className="text-xs text-zinc-500 font-mono mt-0.5">{user.email}</div>
                            </td>
                            <td className="py-4">
                              <select
                                disabled={isMe}
                                value={user.role}
                                onChange={(e) => handleRoleChange(user._id, e.target.value as UserRole)}
                                className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg border appearance-none outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getRoleBadge(user.role)}`}
                              >
                                <option value="admin">Level 4: Admin</option>
                                <option value="analyst">Level 3: Analyst</option>
                                <option value="field">Level 2: Field Ranger</option>
                                <option value="viewer">Level 1: Viewer</option>
                              </select>
                            </td>
                            <td className="py-4 text-right pr-4">
                              <button
                                disabled={isMe || deletingId === user._id}
                                onClick={() => handleDeleteUser(user._id, user.name)}
                                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                title={isMe ? "Cannot terminate yourself" : "Terminate Access"}
                              >
                                {deletingId === user._id ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Side Panel: Notification Preferences */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 h-fit">
            <h2 className="text-lg font-bold text-white mb-1">Comms Preferences</h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-6">Manage your alert streams</p>

            <div className="flex flex-col gap-4 mb-8">
              {[
                { id: 'critical', label: 'CRITICAL Threats (Red)', desc: 'Immediate mobile/dashboard push', color: 'text-red-500' },
                { id: 'high', label: 'HIGH Threats (Orange)', desc: 'Important actionable intelligence', color: 'text-orange-500' },
                { id: 'medium', label: 'MEDIUM Threats (Yellow)', desc: 'General anomalies', color: 'text-yellow-500' },
                { id: 'low', label: 'LOW Threats (Green)', desc: 'Minor changes and updates', color: 'text-blue-500' },
                { id: 'digest', label: 'Weekly Email Digest', desc: 'Summary of all zone activities', color: 'text-cyan-500' },
              ].map((pref) => (
                <label key={pref.id} className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-1">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={myPrefs[pref.id as keyof typeof myPrefs]}
                      onChange={(e) => setMyPrefs(prev => ({ ...prev, [pref.id]: e.target.checked }))}
                    />
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      myPrefs[pref.id as keyof typeof myPrefs] 
                        ? 'bg-white text-black border-white' 
                        : 'border-white/20 bg-white/5 group-hover:border-white/40'
                    }`}>
                      {myPrefs[pref.id as keyof typeof myPrefs] && <span className="text-xs font-bold">✓</span>}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${pref.color}`}>{pref.label}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{pref.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={handleSavePrefs}
              disabled={isSavingPrefs}
              className="w-full relative overflow-hidden group bg-white hover:bg-zinc-200 text-black rounded-xl p-3 flex items-center justify-center gap-2 transition-all disabled:opacity-50 font-mono text-xs font-bold uppercase tracking-widest"
            >
              {isSavingPrefs ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Preferences
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
