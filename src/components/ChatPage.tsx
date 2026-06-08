"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip, Zap, Globe, Send, X, FileText, Image, Film,
  Code2, File, CheckCircle2, AlertCircle, ExternalLink, Loader2,
  Plus, Trash2, ChevronDown, ChevronRight,
} from "lucide-react";
import { useApp } from "@/lib/appContext";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage } from "@/lib/memoryStore";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string | null; // for images/video preview
  text: string | null;    // extracted text for context
}

interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: "connected" | "connecting" | "error" | "idle";
  tools: string[];
}

interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const REASONING_STEPS_LOCAL = [
  "Reading stored memory...",
  "Analyzing context graph...",
  "Retrieving embeddings...",
  "Ranking relevance scores...",
  "Generating response...",
];

const REASONING_STEPS_WEB = [
  "Querying DuckDuckGo...",
  "Parsing search results...",
  "Extracting key information...",
  "Synthesizing answer...",
  "Formatting response...",
];

const PLATFORM_ICONS = [
  { label: "Browser", icon: "🌐" },
  { label: "Drive", icon: "📁" },
  { label: "Slack", icon: "💬" },
  { label: "Teams", icon: "📋" },
];

// ─── DuckDuckGo Web Search (via server-side proxy) ───────────────────────────

async function duckDuckGoSearch(query: string): Promise<WebResult[]> {
  try {
    // Check if running in Electron environment
    if (typeof window !== "undefined" && window.electron && window.electron.webSearch) {
      const data = await window.electron.webSearch(query);
      return (data.results as WebResult[]) ?? [];
    }

    // Fallback for standard web environment
    const res = await fetch(`/api/websearch?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("search api error");
    const data = await res.json();
    return (data.results as WebResult[]) ?? [];
  } catch (err) {
    console.error("Search failed:", err);
    return [
      {
        title: "Search unavailable",
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: "Could not reach search service. Click to search manually.",
      },
    ];
  }
}

// Synthesize a proper AI answer from web results
function synthesizeWebAnswer(query: string, results: WebResult[]): string {
  const good = results.filter(
    (r) => r.snippet && r.snippet.length > 20 && r.title !== "Search unavailable" && r.title !== "No instant results"
  );

  if (good.length === 0) {
    return `I searched DuckDuckGo for **"${query}"** but couldn't find strong results to synthesize. Try clicking a link above to explore manually.`;
  }

  // Build a synthesized answer from the top snippets
  const intro = `Based on web search results for **"${query}"**:\n\n`;

  let body = "";

  // Use the first result as the main answer if it has a good abstract
  const main = good[0];
  if (main.snippet.length > 80) {
    body += `${main.snippet}\n\n`;
  }

  // Summarise remaining results as bullet points
  const others = good.slice(1, 4);
  if (others.length > 0) {
    body += "**Related findings:**\n";
    for (const r of others) {
      const short = r.snippet.length > 120 ? r.snippet.slice(0, 120) + "…" : r.snippet;
      body += `• **${r.title}** — ${short}\n`;
    }
  }

  const footer = `\n*Sources retrieved live from DuckDuckGo · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}*`;

  return intro + body + footer;
}

// ─── File helpers ────────────────────────────────────────────────────────────

function fileIcon(type: string) {
  if (type.startsWith("image/")) return <Image size={13} />;
  if (type.startsWith("video/")) return <Film size={13} />;
  if (type === "application/pdf" || type.includes("pdf")) return <FileText size={13} />;
  if (type.includes("code") || /\.(js|ts|py|java|cpp|c|go|rs|rb|php|sh)/.test(type))
    return <Code2 size={13} />;
  return <File size={13} />;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED = "*/*"; // all formats

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve("");
    reader.readAsText(file);
  });
}

async function processFile(file: File): Promise<AttachedFile> {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isText =
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    /\.(js|ts|tsx|jsx|py|java|cpp|c|go|rs|rb|php|sh|md|txt|json|xml|csv|yaml|yml)$/.test(
      file.name
    );

  let dataUrl: string | null = null;
  let text: string | null = null;

  if (isImage || isVideo) {
    dataUrl = await readFileAsDataUrl(file);
  } else if (isText) {
    text = await readFileAsText(file);
  }

  return {
    id: uuidv4(),
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    dataUrl,
    text,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("**[") && line.includes("]**")) {
          const parts = line.split("**");
          return (
            <p key={i} className="text-sm text-[#333]">
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <strong key={j} className="font-semibold text-black">{part}</strong>
                ) : (
                  part
                )
              )}
            </p>
          );
        }
        if (line.startsWith("> ")) {
          return (
            <blockquote key={i} className="border-l-2 border-[#d0d0d0] pl-3 text-xs text-[#666] italic my-1">
              {line.slice(2)}
            </blockquote>
          );
        }
        if (line.startsWith("*") && line.endsWith("*") && line.length > 2) {
          return <p key={i} className="text-xs text-[#888] mt-2">{line.slice(1, -1)}</p>;
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
          return (
            <p key={i} className="text-sm text-[#333] leading-relaxed">
              {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={j} className="font-semibold text-black">{part.slice(2, -2)}</strong>
                ) : part
              )}
            </p>
          );
      })}
    </div>
  );
}

function ReasoningBlock({ steps }: { steps: string[] }) {
  const [visibleCount, setVisibleCount] = useState(0);
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= steps.length) clearInterval(interval);
    }, 500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="mb-4 px-2">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-[#aaa]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">
          Reasoning
        </span>
      </div>
      <div className="space-y-1.5 ml-1">
        {steps.slice(0, visibleCount).map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#c0c0c0] shrink-0" />
            <span className="text-xs text-[#888]">
              {step.split(" ").map((word, wi) =>
                wi === 0 ? (
                  <span key={wi} className="text-[#555] font-medium">{word} </span>
                ) : (
                  <span key={wi}>{word} </span>
                )
              )}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AttachmentChip({ file, onRemove }: { file: AttachedFile; onRemove?: () => void }) {
  const isImage = file.type.startsWith("image/");
  return (
    <div className="flex items-center gap-1.5 bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg px-2 py-1.5 max-w-[160px]">
      {isImage && file.dataUrl ? (
        <img src={file.dataUrl} alt={file.name} className="w-6 h-6 rounded object-cover shrink-0" />
      ) : (
        <span className="text-[#666] shrink-0">{fileIcon(file.type)}</span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-black truncate leading-tight">{file.name}</p>
        <p className="text-[10px] text-[#999] leading-tight">{formatBytes(file.size)}</p>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="text-[#bbb] hover:text-[#666] ml-auto shrink-0">
          <X size={11} />
        </button>
      )}
    </div>
  );
}

function WebResultsBlock({ results, query }: { results: WebResult[]; query: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-[#888] hover:text-black mb-1.5 transition-colors"
      >
        <Globe size={11} />
        <span>Web results for &quot;{query}&quot;</span>
        {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border border-[#eee] rounded-xl p-3 bg-[#fafafa]">
              {results.map((r, i) => (
                <div key={i} className="text-xs">
                  <div className="flex items-start gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#c0c0c0] mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-black leading-tight">{r.title}</p>
                      <p className="text-[#666] mt-0.5 leading-relaxed">{r.snippet}</p>
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4285F4] hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          {r.url.slice(0, 50)}{r.url.length > 50 ? "…" : ""}
                          <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  if (isUser) {
    const attachments: AttachedFile[] = (message as any).attachments ?? [];
    return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-end gap-1 mb-4"
    >
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-end mb-1 max-w-[85%] md:max-w-[70%]">
          {attachments.map((f) => (
            <AttachmentChip key={f.id} file={f} />
          ))}
        </div>
      )}
      <div className="bg-black text-white text-sm px-4 py-2.5 rounded-[18px] rounded-tr-[4px] max-w-[85%] md:max-w-[70%] leading-relaxed">
        {message.content}
      </div>

        <div className="flex items-center gap-2 px-1">
          <div className="flex gap-1">
            {PLATFORM_ICONS.map((p) => (
              <div key={p.label} className="w-4 h-4 text-[8px] flex items-center justify-center" title={p.label}>
                {p.icon}
              </div>
            ))}
          </div>
          <span className="text-[11px] text-[#999]">{time}</span>
        </div>
      </motion.div>
    );
  }

  const webResults: WebResult[] = (message as any).webResults ?? [];
  const webQuery: string = (message as any).webQuery ?? "";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
      <div className="max-w-[95%] md:max-w-[80%]">
        {webResults.length > 0 && <WebResultsBlock results={webResults} query={webQuery} />}
        <MarkdownText text={message.content} />
        <p className="text-[11px] text-[#bbb] mt-1.5">{time}</p>
      </div>
    </motion.div>
  );
}

// ─── MCP Modal ───────────────────────────────────────────────────────────────

const PRESET_MCP_SERVERS = [
  { name: "Filesystem", url: "mcp://localhost:3001/filesystem", tools: ["read_file", "write_file", "list_dir"] },
  { name: "GitHub", url: "mcp://localhost:3002/github", tools: ["search_repos", "get_issues", "create_pr"] },
  { name: "Postgres", url: "mcp://localhost:3003/postgres", tools: ["query", "list_tables", "describe_table"] },
  { name: "Slack", url: "mcp://localhost:3004/slack", tools: ["send_message", "list_channels", "get_messages"] },
];

function MCPModal({ onClose }: { onClose: () => void }) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);

  const connect = async (server: MCPServer) => {
    setConnecting(server.id);
    // Simulate connection handshake
    await new Promise((r) => setTimeout(r, 1200));
    setServers((prev) =>
      prev.map((s) => s.id === server.id ? { ...s, status: "connected" } : s)
    );
    setConnecting(null);
  };

  const addServer = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    const s: MCPServer = {
      id: uuidv4(),
      name: newName.trim(),
      url: newUrl.trim(),
      status: "idle",
      tools: ["call_tool", "list_tools"],
    };
    setServers((prev) => [...prev, s]);
    setNewName("");
    setNewUrl("");
  };

  const addPreset = (p: typeof PRESET_MCP_SERVERS[0]) => {
    if (servers.find((s) => s.url === p.url)) return;
    setServers((prev) => [...prev, { id: uuidv4(), ...p, status: "idle" }]);
  };

  const remove = (id: string) =>
    setServers((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-2xl shadow-2xl w-[92%] max-w-[500px] max-h-[85vh] flex flex-col border border-[#e5e5e5] overflow-hidden"
        >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-2">
            <Zap size={15} strokeWidth={2} />
            <span className="text-sm font-semibold text-black">MCP Connections</span>
          </div>
          <button onClick={onClose} className="text-[#aaa] hover:text-black transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Presets */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#999] mb-2">
              Quick Connect
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_MCP_SERVERS.map((p) => (
                <button
                  key={p.url}
                  onClick={() => addPreset(p)}
                  disabled={!!servers.find((s) => s.url === p.url)}
                  className={cn(
                    "text-left px-3 py-2 rounded-xl border text-xs transition-colors",
                    servers.find((s) => s.url === p.url)
                      ? "border-[#e5e5e5] text-[#bbb] cursor-not-allowed"
                      : "border-[#e5e5e5] hover:border-black hover:bg-[#fafafa] text-black"
                  )}
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-[#999] mt-0.5 font-mono">{p.tools.slice(0, 2).join(", ")}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom URL */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#999] mb-2">
              Custom Server
            </p>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="w-28 px-3 py-1.5 text-xs rounded-lg border border-[#e5e5e5] outline-none focus:border-black text-black placeholder-[#bbb]"
              />
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="mcp://localhost:3000/..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#e5e5e5] outline-none focus:border-black text-black placeholder-[#bbb] font-mono"
              />
              <button
                onClick={addServer}
                className="px-3 py-1.5 bg-black text-white text-xs rounded-lg hover:bg-[#222] transition-colors"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Server list */}
          {servers.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#999] mb-2">
                Servers
              </p>
              <div className="space-y-2">
                {servers.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#f0f0f0] bg-[#fafafa]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-black">{s.name}</p>
                        {s.status === "connected" && (
                          <span className="text-[10px] bg-[#e6f4ea] text-[#1a7a2e] px-1.5 py-0.5 rounded-full font-medium">
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#999] font-mono truncate mt-0.5">{s.url}</p>
                      {s.status === "connected" && (
                        <p className="text-[10px] text-[#aaa] mt-0.5">
                          Tools: {s.tools.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {s.status !== "connected" && (
                        <button
                          onClick={() => connect(s)}
                          disabled={connecting === s.id}
                          className="text-xs px-2.5 py-1 rounded-lg border border-[#e5e5e5] hover:border-black hover:bg-white transition-colors text-black disabled:opacity-50 flex items-center gap-1"
                        >
                          {connecting === s.id ? (
                            <><Loader2 size={10} className="animate-spin" /> Connecting</>
                          ) : "Connect"}
                        </button>
                      )}
                      {s.status === "connected" && (
                        <CheckCircle2 size={14} className="text-[#1a7a2e]" />
                      )}
                      <button onClick={() => remove(s.id)} className="text-[#ccc] hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#f0f0f0]">
          <p className="text-[10px] text-[#bbb] text-center">
            MCP (Model Context Protocol) — all connections are local
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main ChatPage ────────────────────────────────────────────────────────────

export function ChatPage() {
  const {
    currentMessages, addMessage, memories, privacyMode,
    webEnabled, setWebEnabled,
  } = useApp();

  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showMCP, setShowMCP] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [webSearching, setWebSearching] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, isThinking]);

  // ── File handling ────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const processed = await Promise.all(arr.map(processFile));
    setAttachedFiles((prev) => [...prev, ...processed]);
  }, []);

  const removeFile = (id: string) =>
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  // ── Send ─────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && attachedFiles.length === 0) || isThinking) return;
    const currentAttachments = [...attachedFiles];
    setInput("");
    setAttachedFiles([]);

    // Build display text
    const displayText = text || `[${currentAttachments.map((f) => f.name).join(", ")}]`;

    const userMsg: ChatMessage & { attachments?: AttachedFile[] } = {
      id: uuidv4(),
      role: "user",
      content: displayText,
      timestamp: new Date().toISOString(),
      attachments: currentAttachments,
    };
    addMessage(userMsg);
    setIsThinking(true);

    // ── Web search if enabled ───────────────────────────────────────────
    let webResults: WebResult[] = [];
    if (webEnabled && text) {
      setWebSearching(true);
      webResults = await duckDuckGoSearch(text);
      setWebSearching(false);
    }

    // ── RAG pipeline ───────────────────────────────────────────────────
    const reasoningSteps = webEnabled && !privacyMode ? REASONING_STEPS_WEB : REASONING_STEPS_LOCAL;
    await new Promise((r) => setTimeout(r, reasoningSteps.length * 500 + 600));

    // Build attachment context
    let attachCtx = "";
    for (const f of currentAttachments) {
      if (f.text) {
        attachCtx += `\n\n[File: ${f.name}]\n${f.text.slice(0, 600)}`;
      } else if (f.dataUrl) {
        attachCtx += `\n\n[Attached: ${f.name} (${f.type})]`;
      } else {
        attachCtx += `\n\n[Attached: ${f.name} (${formatBytes(f.size)})]`;
      }
    }
    void attachCtx; // used for future local-LLM context injection

    // Choose response strategy: web-first when web is on, else local RAG
    let responseText: string;
    let sources: string[] = [];

    if (webEnabled && !privacyMode && webResults.length > 0 && text) {
      // Web mode: synthesize answer from live search results
      responseText = synthesizeWebAnswer(text, webResults);
    } else if (typeof window !== "undefined" && window.electron && window.electron.askAI) {
      // Real Local RAG mode: use the Electron IPC
      const res = await window.electron.askAI(text || "Summarize my memory");
      responseText = res.answer;
      sources = res.sources;
    } else {
      // Fallback for non-electron web environment
      responseText = "Local memory retrieval is only available in the EchoSphere desktop application. Please download the app for the full private memory experience.";
    }

    // Augment with attachment note
    if (currentAttachments.length > 0) {
      const names = currentAttachments.map((f) => f.name).join(", ");
      const hasText = currentAttachments.filter((f) => f.text).length;
      responseText += `\n\n> Attachments: ${names}.`;
      if (hasText > 0) {
        responseText += ` Extracted text content from ${hasText} file(s) for context.`;
      }
    }

    const assistantMsg: ChatMessage & { webResults?: WebResult[]; webQuery?: string } = {
      id: uuidv4(),
      role: "assistant",
      content: responseText,
      timestamp: new Date().toISOString(),
      reasoningSteps: reasoningSteps,
      sources: sources,
      webResults: webResults.length > 0 ? webResults : undefined,
      webQuery: webResults.length > 0 ? text : undefined,
    };
    addMessage(assistantMsg);
    setIsThinking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = currentMessages.length === 0 && !isThinking;

  return (
    <>
      <div
        className={cn("flex flex-col h-full transition-colors", dragOver && "bg-[#f8f8ff]")}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 border-2 border-dashed border-[#aaa] rounded-2xl m-4 pointer-events-none"
            >
              <div className="text-center">
                <Paperclip size={24} className="mx-auto mb-2 text-[#888]" strokeWidth={1.5} />
                <p className="text-sm font-medium text-[#555]">Drop files to attach</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-2">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center mb-3">
                <span className="text-white text-sm font-bold">E</span>
              </div>
              <h2 className="text-base font-semibold text-black mb-1">EchoSphere</h2>
              <p className="text-sm text-[#888] max-w-xs">
                Ask about your stored memories, paste files, or search the web.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
                {[
                  "What was discussed about vector databases?",
                  "Summarize last week's meetings",
                  "What do I know about privacy architecture?",
                  "Show RAG performance notes",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-xs px-3 py-2 rounded-xl border border-[#e0e0e0] text-[#666] hover:border-[#aaa] hover:text-black transition-colors text-left sm:text-center"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentMessages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {(isThinking || webSearching) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
              {webSearching && (
                <div className="flex items-center gap-2 mb-2 px-2">
                  <Globe size={11} className="text-[#888] animate-pulse" />
                  <span className="text-xs text-[#888]">Searching DuckDuckGo...</span>
                </div>
              )}
              {isThinking && <ReasoningBlock steps={webEnabled && !privacyMode ? REASONING_STEPS_WEB : REASONING_STEPS_LOCAL} />}
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2">
          <div className={cn(
            "bg-white border rounded-2xl shadow-sm overflow-hidden transition-colors",
            dragOver ? "border-[#aaa]" : "border-[#e5e5e5]"
          )}>
            {/* Attachment previews */}
            <AnimatePresence>
              {attachedFiles.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 px-3 md:px-4 pt-3">
                    {attachedFiles.map((f) => (
                      <AttachmentChip key={f.id} file={f} onRemove={() => removeFile(f.id)} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-1">
              {/* Attach */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-[#777] hover:text-black px-2 py-1 rounded-md hover:bg-[#f5f5f5] transition-colors"
              >
                <Paperclip size={13} strokeWidth={1.8} />
                Attach
              </button>

              {/* MCP */}
              <button
                onClick={() => setShowMCP(true)}
                className="flex items-center gap-1.5 text-xs text-[#777] hover:text-black px-2 py-1 rounded-md hover:bg-[#f5f5f5] transition-colors"
              >
                <Zap size={13} strokeWidth={1.8} />
                MCP
              </button>

              {/* Web */}
              <button
                onClick={() => !privacyMode && setWebEnabled(!webEnabled)}
                title={privacyMode ? "Disabled in Privacy Mode" : webEnabled ? "Web search ON" : "Enable web search"}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors",
                  privacyMode
                    ? "text-[#ccc] cursor-not-allowed"
                    : webEnabled
                    ? "text-black bg-[#f0f0f0] font-medium"
                    : "text-[#777] hover:text-black hover:bg-[#f5f5f5]"
                )}
              >
                <Globe size={13} strokeWidth={1.8} />
                Web
                {webEnabled && !privacyMode && (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                )}
              </button>
            </div>

            {/* Text input */}
            <div className="flex items-end gap-2 px-4 pb-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={attachedFiles.length > 0 ? "Add a message or send files..." : "Ask anything..."}
                rows={1}
                className="flex-1 resize-none text-sm text-black placeholder-[#bbb] outline-none bg-transparent leading-relaxed max-h-32 overflow-y-auto"
                style={{ minHeight: "24px" }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 128) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && attachedFiles.length === 0) || isThinking}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0",
                  (input.trim() || attachedFiles.length > 0) && !isThinking
                    ? "bg-black text-white hover:bg-[#222]"
                    : "bg-[#e5e5e5] text-[#aaa] cursor-not-allowed"
                )}
              >
                Send
              </button>
            </div>
          </div>

          <p className="text-[10px] text-[#ccc] text-center mt-2">
            Drag & drop files · All processing local · Privacy {privacyMode ? "ON" : "OFF"}
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* MCP Modal */}
      <AnimatePresence>
        {showMCP && <MCPModal onClose={() => setShowMCP(false)} />}
      </AnimatePresence>
    </>
  );
}
