"use client";
import React from "react";
import {
  Mail,
  Phone,
  MapPin,
  LayoutDashboard,
  Activity,
  History,
  Map as MapIcon,
  TreePine,
  Pickaxe,
  Droplets,
  FileText,
  BookOpen,
  Code,
  Send
} from "lucide-react";
import { FooterBackgroundGradient } from "@/components/ui/hover-footer";
import { TextHoverEffect } from "@/components/ui/hover-footer";
import { usePathname } from "next/navigation";

const GithubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
);

export function Footer() {
  const pathname = usePathname();

  // Hide footer on specific pages
  if (
    pathname === "/auth" || pathname?.startsWith("/auth/") ||
    pathname === "/dashboard" || pathname?.startsWith("/dashboard/") ||
    pathname === "/zones" || pathname?.startsWith("/zones/")
  ) {
    return null;
  }

  const platformLinks = [
    { icon: <LayoutDashboard size={18} className="text-[#3ca2fa]" />, label: "Dashboard", href: "#" },
    { icon: <Activity size={18} className="text-[#3ca2fa]" />, label: "Monitoring", href: "#" },
    { icon: <History size={18} className="text-[#3ca2fa]" />, label: "Historical Analysis", href: "#" },
    { icon: <MapIcon size={18} className="text-[#3ca2fa]" />, label: "Zones", href: "#" },
  ];

  const solutionsLinks = [
    { icon: <TreePine size={18} className="text-[#3ca2fa]" />, label: "Deforestation Detection", href: "#" },
    { icon: <Pickaxe size={18} className="text-[#3ca2fa]" />, label: "Illegal Mining", href: "#" },
    { icon: <Droplets size={18} className="text-[#3ca2fa]" />, label: "Water Pollution", href: "#" },
    { icon: <FileText size={18} className="text-[#3ca2fa]" />, label: "Evidence Reports", href: "#" },
  ];

  const resourcesLinks = [
    { icon: <BookOpen size={18} className="text-[#3ca2fa]" />, label: "Documentation", href: "#" },
    { icon: <Code size={18} className="text-[#3ca2fa]" />, label: "API", href: "#" },
    { icon: <GithubIcon className="text-[#3ca2fa]" />, label: "GitHub", href: "#" },
    { icon: <Send size={18} className="text-[#3ca2fa]" />, label: "Contact", href: "#" },
  ];

  const contactInfo = [
    {
      icon: <Mail size={18} className="text-[#3ca2fa] mt-1 shrink-0" />,
      label: "Email",
      text: "team@terrawatch.ai",
      href: "mailto:team@terrawatch.ai",
    },
    {
      icon: <Phone size={18} className="text-[#3ca2fa] mt-1 shrink-0" />,
      label: "Phone",
      text: "+91 800 555 0199",
      href: "tel:+918005550199",
    },
    {
      icon: <MapPin size={18} className="text-[#3ca2fa] mt-1 shrink-0" />,
      label: "Location",
      text: "Pench Forest Demo Region\nMadhya Pradesh, India",
    },
  ];

  const socialLinks = [
    { icon: <GithubIcon />, label: "Github", href: "#" },
    { icon: <TwitterIcon />, label: "Twitter", href: "#" },
    { icon: <LinkedinIcon />, label: "LinkedIn", href: "#" },
    { icon: <Mail size={20} />, label: "Mail", href: "mailto:team@terrawatch.ai" },
  ];

  return (
    <footer className="bg-[#0F0F11]/10 relative h-fit rounded-3xl overflow-hidden m-8 mt-24 border border-white/5 pb-8">
      <div className="max-w-7xl mx-auto p-8 md:p-14 z-40 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-12 md:gap-8 lg:gap-12 pb-12">
          {/* Brand section (takes up 2 columns on xl screens) */}
          <div className="flex flex-col space-y-4 xl:col-span-2 pr-4">
            <div className="flex items-center space-x-2">
              <span className="text-[#3ca2fa] text-3xl font-extrabold">&#9679;</span>
              <span className="text-white text-3xl font-bold">TerraWatch</span>
            </div>
            <p className="text-[10px] uppercase font-mono tracking-widest text-[#3ca2fa] font-bold">
              SATELLITE INTELLIGENCE PLATFORM
            </p>
            <p className="text-sm leading-relaxed text-zinc-400 mt-2">
              AI-powered satellite intelligence platform that detects deforestation, illegal mining, and environmental threats using Sentinel imagery, NDVI analysis, and AI models. Delivering real-time alerts and legal-grade evidence for faster environmental protection.
            </p>
            <div className="flex space-x-3 pt-4">
              {socialLinks.map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="p-2 border border-white/10 rounded-xl text-zinc-400 hover:text-[#3ca2fa] hover:border-[#3ca2fa]/50 transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Platform section */}
          <div>
            <h4 className="text-white text-base font-semibold mb-6">Platform</h4>
            <ul className="space-y-4">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="flex items-center gap-3 text-sm text-zinc-400 hover:text-[#3ca2fa] transition-colors">
                    {link.icon}
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions section */}
          <div>
            <h4 className="text-white text-base font-semibold mb-6">Solutions</h4>
            <ul className="space-y-4">
              {solutionsLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="flex items-center gap-3 text-sm text-zinc-400 hover:text-[#3ca2fa] transition-colors">
                    {link.icon}
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources section */}
          <div>
            <h4 className="text-white text-base font-semibold mb-6">Resources</h4>
            <ul className="space-y-4">
              {resourcesLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="flex items-center gap-3 text-sm text-zinc-400 hover:text-[#3ca2fa] transition-colors">
                    {link.icon}
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider with text */}
        <div className="relative flex items-center justify-center mt-6 mb-4 xl:mt-10 xl:mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed border-white/20"></div>
          </div>
          <div className="relative flex items-center justify-center bg-[#060608] px-4">
            <span className="text-sm md:text-base font-mono tracking-[0.2em] text-[#3ca2fa] uppercase">
              Built by
            </span>
          </div>
        </div>
      </div>

      {/* Text hover effect */}
      <div className="lg:flex hidden h-[22rem] -mt-24 -mb-32 pointer-events-auto items-center justify-center">
        <TextHoverEffect text="Nikhil" className="z-50 w-full px-8" />
      </div>

      {/* Copyright */}
      <div className="relative z-50 text-center text-xs text-zinc-500 pb-8 mt-12">
        &copy; 2026 TerraWatch — Build by Nikhil yadav!
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}
