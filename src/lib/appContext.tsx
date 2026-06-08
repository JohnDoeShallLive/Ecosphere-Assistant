"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  MemoryEntry,
  ChatMessage,
  INITIAL_MEMORIES,
} from "@/lib/memoryStore";
import { v4 as uuidv4 } from "uuid";

interface AppContextType {
  memories: MemoryEntry[];
  addMemory: (entry: Omit<MemoryEntry, "id">) => void;
  chatHistory: { id: string; title: string; messages: ChatMessage[]; pinned?: boolean; archived?: boolean }[];
  currentChatId: string;
  currentMessages: ChatMessage[];
  startNewChat: () => void;
  selectChat: (id: string) => void;
  addMessage: (msg: ChatMessage) => void;
  renameChat: (id: string, title: string) => void;
  pinChat: (id: string) => void;
  archiveChat: (id: string) => void;
  deleteChat: (id: string) => void;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
  activePage: string;
  setActivePage: (page: string) => void;
  webEnabled: boolean;
  setWebEnabled: (v: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [memories, setMemories] = useState<MemoryEntry[]>(INITIAL_MEMORIES);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [activePage, setActivePage] = useState("chat");
  const [webEnabled, setWebEnabled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const loadMemories = async () => {
      if (typeof window !== "undefined" && window.electron && window.electron.queryMemories) {
        const stored = await window.electron.queryMemories("", 100); // Get all
        setMemories(stored as any);
      }
    };
    loadMemories();
  }, []);

  const addMemory = async (entry: Omit<MemoryEntry, "id">) => {
    if (typeof window !== "undefined" && window.electron && window.electron.saveMemory) {
      const res = await window.electron.saveMemory(entry.content, { 
        source: entry.source, 
        topic: entry.topic,
        tags: entry.tags 
      });
      if (res.success && res.id) {
        setMemories((prev) => [{ ...entry, id: res.id! } as MemoryEntry, ...prev]);
      }
    } else {
      setMemories((prev) => [{ ...entry, id: uuidv4() }, ...prev]);
    }
  };

  const newChatId = uuidv4();
  const [chatHistory, setChatHistory] = useState<
    { id: string; title: string; messages: ChatMessage[]; pinned?: boolean; archived?: boolean }[]
  >([{ id: newChatId, title: "New Chat", messages: [] }]);
  const [currentChatId, setCurrentChatId] = useState(newChatId);

  const currentMessages =
    chatHistory.find((c) => c.id === currentChatId)?.messages ?? [];

  const startNewChat = () => {
    const id = uuidv4();
    setChatHistory((prev) => [
      { id, title: "New Chat", messages: [] },
      ...prev,
    ]);
    setCurrentChatId(id);
    setActivePage("chat");
  };

  const selectChat = (id: string) => {
    setCurrentChatId(id);
    setActivePage("chat");
  };

  const addMessage = (msg: ChatMessage) => {
    setChatHistory((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        const newMessages = [...chat.messages, msg];
        // Use first user message as title
        const title =
          chat.title === "New Chat" && msg.role === "user"
            ? msg.content.slice(0, 40)
            : chat.title;
        return { ...chat, messages: newMessages, title };
      })
    );
  };

  const renameChat = (id: string, title: string) => {
    setChatHistory((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  };

  const pinChat = (id: string) => {
    setChatHistory((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const archiveChat = (id: string) => {
    setChatHistory((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived: !c.archived } : c))
    );
  };

  const deleteChat = (id: string) => {
    setChatHistory((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (currentChatId === id) {
        setCurrentChatId(next[0]?.id ?? "");
      }
      return next.length ? next : [{ id: uuidv4(), title: "New Chat", messages: [] }];
    });
  };

  const togglePrivacyMode = () => {
    setPrivacyMode((v) => {
      if (!v) setWebEnabled(false); // disable web when privacy ON
      return !v;
    });
  };

  return (
    <AppContext.Provider
      value={{
        memories,
        addMemory,
        chatHistory,
        currentChatId,
        currentMessages,
        startNewChat,
        selectChat,
        addMessage,
        renameChat,
        pinChat,
        archiveChat,
        deleteChat,
        privacyMode,
        togglePrivacyMode,
        activePage,
        setActivePage,
        webEnabled,
        setWebEnabled,
        isSidebarOpen,
        setIsSidebarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
