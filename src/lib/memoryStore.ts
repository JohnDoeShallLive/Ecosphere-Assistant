export interface MemoryEntry {
  id: string;
  content: string;
  topic: string;
  source: "Web" | "File" | "Notes" | "Meeting" | "System" | "Clipboard";
  sentiment: "positive" | "neutral" | "negative";
  timestamp: string;
  tags: string[];
  embedding?: number[];
  summary: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  reasoningSteps?: string[];
  sources?: string[];
}

// Initialized as empty since we now fetch from LanceDB
export const INITIAL_MEMORIES: MemoryEntry[] = [];

/**
 * Note: Mock logic for embeddings, similarity, and RAG generation 
 * has been replaced by the Electron Main Process AI Stack (LanceDB + Ollama).
 * 
 * Direct calls to window.electron.askAI and window.electron.queryMemories 
 * should be used in the renderer.
 */
