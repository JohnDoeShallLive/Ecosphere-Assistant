const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDB, addMemory, searchMemories } = require('./database');
const { encrypt, decrypt } = require('./security');
const { generateEmbedding, queryOllama } = require('./ai');
const { v4: uuidv4 } = require('uuid');
const { startClipboardMonitor } = require('./capture');
const isDev = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false, // Truly frameless
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false, // Prevent DevTools from being used
    },
    backgroundColor: '#0a0a0a',
  });

  // Window control IPCs
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow.close());

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });


}

app.whenReady().then(async () => {
  await initDB();
  createWindow();

  // Start background capture
  startClipboardMonitor(async (content, metadata) => {
    try {
      const id = uuidv4();
      const encryptedText = encrypt(content);
      const vector = await generateEmbedding(content);
      await addMemory(id, encryptedText, metadata, vector);
      console.log(`[Capture] Auto-saved clipboard: ${id}`);
    } catch (err) {
      console.error('[Capture] Error:', err);
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler for Web Search (replacing /api/websearch)
ipcMain.handle('web-search', async (event, query) => {
  if (!query) return { results: [] };

  try {
    // DDG Instant Answers API
    const iaUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const iaRes = await fetch(iaUrl, {
      headers: { "User-Agent": "EchoSphere/1.0" }
    });

    const iaData = await iaRes.json();
    const iaResults = [];

    if (iaData.AbstractText && iaData.AbstractURL) {
      iaResults.push({
        title: iaData.Heading || query,
        url: iaData.AbstractURL,
        snippet: iaData.AbstractText,
      });
    }

    if (iaData.Answer) {
      iaResults.push({ title: "Direct Answer", url: "", snippet: iaData.Answer });
    }

    const topics = iaData.RelatedTopics ?? [];
    for (const t of topics) {
      if (iaResults.length >= 5) break;
      if (t.Text && t.FirstURL) {
        iaResults.push({
          title: t.Text.split(" - ")[0]?.trim() || t.Text.slice(0, 70),
          url: t.FirstURL,
          snippet: t.Text,
        });
      }
    }

    if (iaResults.length >= 2) {
      return { results: iaResults.slice(0, 5), source: "instant" };
    }

    // Fallback: search link
    return {
      results: [
        {
          title: `Search: ${query}`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: "Click to open this search in DuckDuckGo.",
        },
      ],
      source: "fallback",
    };
  } catch (err) {
    console.error("[electron-main] websearch error:", err);
    return {
      results: [
        {
          title: "Search unavailable",
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: "Error occurred during search. Click to search manually.",
        },
      ],
      source: "error",
    };
  }
});

// New EchoSphere IPC Handlers
ipcMain.handle('save-memory', async (event, { content, metadata }) => {
  try {
    const id = uuidv4();
    const encryptedText = encrypt(content);
    const vector = await generateEmbedding(content);
    await addMemory(id, encryptedText, metadata, vector);
    return { success: true, id };
  } catch (err) {
    console.error('Save Memory Error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('query-memories', async (event, { query, limit }) => {
  try {
    const queryVector = await generateEmbedding(query);
    const results = await searchMemories(queryVector, limit);
    
    // Decrypt content for the frontend
    return results.map(r => ({
      ...r,
      content: decrypt(r.text),
      text: undefined // Hide encrypted text
    }));
  } catch (err) {
    console.error('Query Memories Error:', err);
    return [];
  }
});

ipcMain.handle('ask-ai', async (event, { question }) => {
  try {
    const queryVector = await generateEmbedding(question);
    const contextResults = await searchMemories(queryVector, 3);
    const context = contextResults
      .map(r => `[${r.metadata.source || 'Unknown'}] ${decrypt(r.text)}`)
      .join('\n\n');
    
    const answer = await queryOllama(question, context);
    return { answer, sources: contextResults.map(r => r.metadata.source) };
  } catch (err) {
    console.error('Ask AI Error:', err);
    return { answer: "I encountered an error while processing your request.", sources: [] };
  }
});

