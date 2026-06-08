"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { MemoryEntry } from "@/lib/memoryStore";

const SOURCE_COLORS: Record<string, string> = {
  Meeting: "#1a1a1a",
  Web: "#2563eb",
  File: "#16a34a",
  Notes: "#d97706",
  System: "#7c3aed",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

function groupByDate(memories: MemoryEntry[]): Record<string, MemoryEntry[]> {
  const groups: Record<string, MemoryEntry[]> = {};
  const sorted = [...memories].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  for (const m of sorted) {
    const date = new Date(m.timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    groups[date] = groups[date] || [];
    groups[date].push(m);
  }
  return groups;
}

function MemoryItem({ memory }: { memory: MemoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(memory.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const color = SOURCE_COLORS[memory.source] || "#888";

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div
        className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-white"
        style={{ backgroundColor: color, boxShadow: `0 0 0 1px ${color}44` }}
      />

      <div
        className="bg-white border border-[#ebebeb] rounded-xl p-4 mb-3 cursor-pointer hover:border-[#d0d0d0] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ backgroundColor: color + "18", color }}
              >
                {memory.source}
              </span>
              <span className="text-[11px] text-[#999]">{time}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  memory.sentiment === "positive"
                    ? "bg-green-50 text-green-600"
                    : memory.sentiment === "negative"
                    ? "bg-red-50 text-red-500"
                    : "bg-gray-50 text-gray-500"
                }`}
              >
                {SENTIMENT_LABELS[memory.sentiment]}
              </span>
            </div>
            <p className="text-sm font-medium text-black leading-snug">
              {memory.summary}
            </p>
            <p className="text-xs text-[#888] mt-1">{memory.topic}</p>
          </div>
          <div className="shrink-0 text-[#bbb]">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-[#f0f0f0]">
                <p className="text-xs text-[#555] leading-relaxed">
                  {memory.content}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {memory.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-[#f7f7f7] text-[#777] px-1.5 py-0.5 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function TimelinePage() {
  const { memories } = useApp();
  const groups = groupByDate(memories);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-black">Timeline</h2>
            <p className="text-xs text-[#999] mt-0.5">
              {memories.length} captured memory events
            </p>
          </div>
          <div className="text-xs text-[#999] bg-[#f5f5f5] px-3 py-1 rounded-full">
            Chronological view
          </div>
        </div>

        {Object.entries(groups).map(([date, items]) => (
          <div key={date} className="mb-8">
            {/* Date header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px bg-[#e5e5e5] flex-1" />
              <span className="text-xs font-semibold text-[#888] whitespace-nowrap">
                {date}
              </span>
              <div className="h-px bg-[#e5e5e5] flex-1" />
            </div>

            {/* Timeline line */}
            <div className="relative">
              <div className="absolute left-[5px] top-0 bottom-0 w-px bg-[#ececec]" />
              {items.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <MemoryItem memory={m} />
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
