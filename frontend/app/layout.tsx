import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";
import { BackgroundWrapper } from "@/components/ui/BackgroundWrapper";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EcoWatch | Orbital Environmental Intelligence",
  description:
    "Next-generation satellite-powered environmental monitoring, AI threat detection, and field command powered by GPT-4o Vision.",
  keywords: ["deforestation", "satellite", "AI", "environmental monitoring", "EcoWatch"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen flex flex-col antialiased`}>
        {/* ── Global Interactive 3D Background ── */}
        <BackgroundWrapper />

        <AuthProvider>
          <Navbar />
          <main className="flex-1 pt-24 pb-12 px-4 relative z-10">
            {children}
          </main>
          <Footer />
        </AuthProvider>

        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: "rgba(15, 20, 40, 0.85)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#f1f5f9",
            },
          }}
        />
      </body>
    </html>
  );
}
