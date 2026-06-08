import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EchoSphere — Privacy-First Local AI Memory",
  description: "A fully offline, privacy-first AI memory system",
};

import { TitleBar } from "@/components/TitleBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" className="light h-full overflow-hidden">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased h-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden`}
        >
        <Script
          id="orchids-browser-logs"
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
          strategy="afterInteractive"
          data-orchids-project-id="4dc3581d-bb99-45d2-832d-448e5a30ae95"
        />
        <TitleBar />
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
