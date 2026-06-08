"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  GitBranch,
  Clock,
  Share2,
  Plus,
  MoreHorizontal,
  Share,
  Users,
  Pencil,
  Pin,
  Archive,
  Trash2,
  PinOff,
  ArchiveRestore,
} from "lucide-react";
import { useApp } from "@/lib/appContext";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "graph", label: "Memory Graph", icon: GitBranch },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "share", label: "Secure Share", icon: Share2 },
];

interface MenuPos {
  chatId: string;
  x: number;
  y: number;
}

export function Sidebar() {
  const {
    activePage,
    setActivePage,
    chatHistory,
    selectChat,
    startNewChat,
    currentChatId,
    renameChat,
    pinChat,
    archiveChat,
    deleteChat,
    isSidebarOpen,
    setIsSidebarOpen,
  } = useApp();

  const [menu, setMenu] = useState<MenuPos | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menu]);

  // Focus rename input
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const openMenu = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ chatId, x: rect.right + 4, y: rect.top });
  };

  const handleRename = (chatId: string) => {
    const chat = chatHistory.find((c) => c.id === chatId);
    setRenameValue(chat?.title ?? "");
    setRenamingId(chatId);
    setMenu(null);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameChat(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const menuChat = menu ? chatHistory.find((c) => c.id === menu.chatId) : null;

  // Sort: pinned first
  const sorted = [...chatHistory].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const visible = sorted.filter((c) => !c.archived);
  const archived = sorted.filter((c) => c.archived);

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[90] md:hidden"
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "fixed md:relative top-14 md:top-0 bottom-0 left-0 w-[240px] md:w-[200px] shrink-0 bg-[#f5f5f5] border-r border-[#e5e5e5] flex flex-col h-[calc(100vh-56px)] md:h-full z-[100] transition-transform duration-300 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Nav items */}
        <div className="pt-3 px-3 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left",
                  isActive
                    ? "bg-white text-black shadow-sm"
                    : "text-[#666] hover:bg-white/60 hover:text-black"
                )}
              >
                <Icon size={14} strokeWidth={1.8} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-3 my-3 border-t border-[#e5e5e5]" />

        {/* New Chat button */}
        <div className="px-3">
          <button
            onClick={() => {
              startNewChat();
              if (window.innerWidth < 768) setIsSidebarOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-[#222] transition-colors w-full"
          >
            <Plus size={14} strokeWidth={2} />
            New Chat
          </button>
        </div>

        {/* Chat history */}
        <div className="mt-3 px-3 flex flex-col gap-0.5 overflow-y-auto flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] px-1 mb-1">
            History
          </p>

          {visible.map((chat) => (
            <div key={chat.id} className="group relative">
              {renamingId === chat.id ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="w-full px-3 py-1.5 rounded-md text-xs border border-[#d0d0d0] bg-white outline-none"
                />
              ) : (
                <button
                  onClick={() => {
                    selectChat(chat.id);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors w-full text-left",
                    currentChatId === chat.id && activePage === "chat"
                      ? "bg-white text-black shadow-sm"
                      : "text-[#777] hover:bg-white/60 hover:text-black"
                  )}
                >
                  {chat.pinned ? (
                    <Pin size={10} strokeWidth={2} className="shrink-0 text-[#aaa]" />
                  ) : (
                    <MessageSquare size={11} strokeWidth={1.8} className="shrink-0" />
                  )}
                  <span className="truncate flex-1">{chat.title}</span>
                  <span
                    onClick={(e) => openMenu(e, chat.id)}
                    className="opacity-0 md:group-hover:opacity-100 p-0.5 rounded hover:bg-[#e0e0e0] transition-opacity"
                    role="button"
                  >
                    <MoreHorizontal size={12} strokeWidth={1.8} />
                  </span>
                </button>
              )}
            </div>
          ))}

          {archived.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#bbb] px-1 mt-3 mb-1">
                Archived
              </p>
              {archived.map((chat) => (
                <div key={chat.id} className="group relative">
                  <button
                    onClick={() => {
                      selectChat(chat.id);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors w-full text-left opacity-60",
                      currentChatId === chat.id && activePage === "chat"
                        ? "bg-white text-black shadow-sm opacity-100"
                        : "text-[#999] hover:bg-white/60 hover:text-black"
                    )}
                  >
                    <Archive size={10} strokeWidth={1.8} className="shrink-0" />
                    <span className="truncate flex-1">{chat.title}</span>
                    <span
                      onClick={(e) => openMenu(e, chat.id)}
                      className="opacity-0 md:group-hover:opacity-100 p-0.5 rounded hover:bg-[#e0e0e0] transition-opacity"
                      role="button"
                    >
                      <MoreHorizontal size={12} strokeWidth={1.8} />
                    </span>
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Context menu portal */}
        <AnimatePresence>
          {menu && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              style={{ position: "fixed", top: menu.y, left: menu.x, zIndex: 9999 }}
              className="bg-white border border-[#e5e5e5] rounded-xl shadow-lg py-1 w-48 text-sm"
            >
              <MenuItem
                icon={<Share size={14} />}
                label="Share"
                onClick={() => {
                  setActivePage("share");
                  setMenu(null);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
              />
              <MenuItem
                icon={<Users size={14} />}
                label="Start a group chat"
                onClick={() => {
                  startNewChat();
                  setMenu(null);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
              />
              <MenuItem
                icon={<Pencil size={14} />}
                label="Rename"
                onClick={() => handleRename(menu.chatId)}
              />
              <div className="my-1 border-t border-[#f0f0f0]" />
              <MenuItem
                icon={menuChat?.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                label={menuChat?.pinned ? "Unpin chat" : "Pin chat"}
                onClick={() => {
                  pinChat(menu.chatId);
                  setMenu(null);
                }}
              />
              <MenuItem
                icon={menuChat?.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                label={menuChat?.archived ? "Unarchive" : "Archive"}
                onClick={() => {
                  archiveChat(menu.chatId);
                  setMenu(null);
                }}
              />
              <div className="my-1 border-t border-[#f0f0f0]" />
              <MenuItem
                icon={<Trash2 size={14} />}
                label="Delete"
                danger
                onClick={() => {
                  deleteChat(menu.chatId);
                  setMenu(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors text-left",
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-[#1a1a1a] hover:bg-[#f5f5f5]"
      )}
    >
      <span className={danger ? "text-red-500" : "text-[#555]"}>{icon}</span>
      {label}
    </button>
  );
}
