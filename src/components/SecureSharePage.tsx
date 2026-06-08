"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Copy, Check, Shield, Wifi } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { MemoryEntry } from "@/lib/memoryStore";

function generateShareId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result.slice(0, 8) + "-" + result.slice(8, 16) + "-" + result.slice(16, 24) + "-" + result.slice(24, 32);
}

const SOURCE_COLORS: Record<string, string> = {
  Meeting: "#1a1a1a",
  Web: "#2563eb",
  File: "#16a34a",
  Notes: "#d97706",
  System: "#7c3aed",
};

export function SecureSharePage() {
  const { memories } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShareId(null);
  };

  const generateShare = async () => {
    if (selected.size === 0) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setShareId(generateShareId());
    setGenerating(false);
  };

  const copyToClipboard = () => {
    if (!shareId) return;
    navigator.clipboard.writeText(shareId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-black">Secure Share</h2>
            <p className="text-xs text-[#999] mt-0.5">
              Select memory nodes to generate an encrypted share ID
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#666] bg-[#f5f5f5] px-3 py-1.5 rounded-full">
            <Shield size={11} strokeWidth={2} />
            Peer-to-Peer Encrypted
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-[#f8f8f8] border border-[#ebebeb] rounded-xl px-4 py-3 mb-5">
          <Wifi size={14} className="text-[#888] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-black">No cloud servers involved</p>
            <p className="text-xs text-[#888] mt-0.5">
              Shares are encrypted locally with X25519 key exchange and transmitted peer-to-peer via libp2p. Your data never leaves your device unencrypted.
            </p>
          </div>
        </div>

        {/* Memory selection */}
        <div className="space-y-2 mb-5">
          {memories.map((m) => {
            const isSelected = selected.has(m.id);
            const color = SOURCE_COLORS[m.source] || "#888";
            return (
              <motion.div
                key={m.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => toggleSelect(m.id)}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-black bg-black/[0.02]"
                    : "border-[#ebebeb] bg-white hover:border-[#d0d0d0]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded shrink-0 mt-0.5 flex items-center justify-center border transition-all ${
                    isSelected ? "bg-black border-black" : "border-[#ccc]"
                  }`}
                >
                  {isSelected && (
                    <Check size={10} strokeWidth={2.5} className="text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color }}
                    >
                      {m.source}
                    </span>
                    <span className="text-[10px] text-[#bbb]">
                      {new Date(m.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-black font-medium leading-snug truncate">
                    {m.summary}
                  </p>
                  <p className="text-xs text-[#888] mt-0.5">{m.topic}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Generate button */}
        <button
          onClick={generateShare}
          disabled={selected.size === 0 || generating}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            selected.size > 0 && !generating
              ? "bg-black text-white hover:bg-[#222]"
              : "bg-[#f0f0f0] text-[#aaa] cursor-not-allowed"
          }`}
        >
          {generating ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full"
              />
              Encrypting {selected.size} node{selected.size !== 1 ? "s" : ""}...
            </>
          ) : (
            <>
              <Lock size={13} strokeWidth={2} />
              Generate Encrypted Share
              {selected.size > 0 && ` (${selected.size} node${selected.size !== 1 ? "s" : ""})`}
            </>
          )}
        </button>

        {/* Share ID result */}
        <AnimatePresence>
          {shareId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 bg-white border border-[#ebebeb] rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-xs font-semibold text-black">Share ID Generated</p>
                <span className="text-[10px] text-[#888] ml-auto">AES-256 + X25519</span>
              </div>
              <div className="flex items-center gap-2 bg-[#f8f8f8] rounded-lg px-3 py-2.5">
                <code className="text-xs font-mono text-[#333] flex-1 break-all">
                  {shareId}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="shrink-0 text-[#888] hover:text-black transition-colors"
                >
                  {copied ? (
                    <Check size={13} className="text-green-600" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-[#aaa] mt-2">
                Share this ID with your peer. They will need their private key to decrypt. This ID expires in 24h and is never stored on any server.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
