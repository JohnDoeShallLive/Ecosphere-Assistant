const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  webSearch: (query) => ipcRenderer.invoke('web-search', query),
  windowControls: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
  },
  saveMemory: (content, metadata) => ipcRenderer.invoke('save-memory', { content, metadata }),
  queryMemories: (query, limit) => ipcRenderer.invoke('query-memories', { query, limit }),
  askAI: (question) => ipcRenderer.invoke('ask-ai', { question }),
});
