// src/app/layout.tsx
import type { Metadata } from "next";
import { Orbitron, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "700", "900"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Reflex Rush — Office Game",
  description: "Game refleks real-time untuk gathering kantor",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${orbitron.variable} ${dmSans.variable}`}>
      <body className="bg-game-dark text-white antialiased">
        {children}
        <Toaster position="top-center" theme="dark" richColors />
      </body>
    </html>
  );
}
