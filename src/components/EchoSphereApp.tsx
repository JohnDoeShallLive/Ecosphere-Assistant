"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Wifi, WifiOff, Menu, X } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { Sidebar } from "@/components/Sidebar";
import { ChatPage } from "@/components/ChatPage";
import { MemoryGraphPage } from "@/components/MemoryGraphPage";
import { TimelinePage } from "@/components/TimelinePage";
import { SecureSharePage } from "@/components/SecureSharePage";

export function EchoSphereApp() {
  const { activePage, privacyMode, togglePrivacyMode, isSidebarOpen, setIsSidebarOpen } = useApp();

  return (
    <div className="flex flex-col h-screen bg-[#f2f2f2] font-sans select-none overflow-hidden">
      {/* Title bar / Header */}
      <div className="h-14 md:h-11 flex items-center justify-between px-4 border-b border-[#e0e0e0] bg-[#f5f5f5] shrink-0 z-50">
        <div className="flex items-center gap-2">
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 -ml-2 hover:bg-black/5 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* App name */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">E</span>
          </div>
          <span className="text-sm font-semibold text-black tracking-tight">EchoSphere</span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Privacy mode toggle - shortened label on mobile */}
          <button
            onClick={togglePrivacyMode}
            className="flex items-center gap-1.5 md:gap-2 text-xs"
          >
            <span className="text-[#666] font-medium hidden sm:inline">
              Privacy Mode
            </span>
            <div
              className={`relative w-8 md:w-9 h-4 md:h-5 rounded-full transition-colors duration-200 ${
                privacyMode ? "bg-black" : "bg-[#d0d0d0]"
              }`}
            >
              <motion.div
                className="absolute top-0.5 w-3 h-3 md:w-4 md:h-4 rounded-full bg-white shadow-sm"
                animate={{ left: privacyMode ? (typeof window !== 'undefined' && window.innerWidth < 768 ? "calc(100% - 14px)" : "calc(100% - 18px)") : "2px" }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              />
            </div>
          </button>

          {/* Status badge - icon only on small mobile */}
          <AnimatePresence>
            {privacyMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1 bg-black text-white text-[10px] font-semibold px-1.5 sm:px-2 py-1 rounded-full"
              >
                <WifiOff size={9} strokeWidth={2.5} />
                <span className="hidden xs:inline">Offline Active</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Privacy banner */}
      <AnimatePresence>
        {privacyMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 28, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center gap-2 bg-black text-white text-[11px] font-medium shrink-0 overflow-hidden"
          >
            <Lock size={10} strokeWidth={2.5} />
            All data processed locally — no cloud APIs, no telemetry
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f7f7f7]">
          <AnimatePresence mode="wait">
            {activePage === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-hidden flex flex-col"
              >
                <ChatPage />
              </motion.div>
            )}
            {activePage === "graph" && (
              <motion.div
                key="graph"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-hidden flex"
              >
                <MemoryGraphPage />
              </motion.div>
            )}
            {activePage === "timeline" && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-hidden flex flex-col"
              >
                <TimelinePage />
              </motion.div>
            )}
            {activePage === "share" && (
              <motion.div
                key="share"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-hidden flex flex-col"
              >
                <SecureSharePage />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
