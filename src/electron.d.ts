export interface IElectronAPI {
  webSearch: (query: string) => Promise<{
    results: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
    source: string;
  }>;
  windowControls: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  saveMemory: (content: string, metadata: any) => Promise<{ success: boolean, id?: string, error?: string }>;
  queryMemories: (query: string, limit?: number) => Promise<Array<{
    id: string;
    content: string;
    metadata: any;
    score: number;
  }>>;
  askAI: (question: string) => Promise<{ answer: string, sources: string[] }>;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
