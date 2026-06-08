const { clipboard, ipcMain } = require('electron');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

let lastText = '';

function startClipboardMonitor(onCapture) {
  setInterval(() => {
    const text = clipboard.readText();
    if (text && text !== lastText && text.length > 10) { // Only capture meaningful text
      lastText = text;
      onCapture(text, { source: 'Clipboard', timestamp: new Date().toISOString() });
    }
  }, 2000); // Check every 2 seconds
}

function startFileWatcher(directory, onCapture) {
  if (!fs.existsSync(directory)) return;

  const watcher = chokidar.watch(directory, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });

  watcher.on('add', (filePath) => {
    if (filePath.endsWith('.txt') || filePath.endsWith('.md')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.length > 0) {
        onCapture(content, { 
          source: 'File', 
          path: filePath, 
          filename: path.basename(filePath),
          timestamp: new Date().toISOString() 
        });
      }
    }
  });

  return watcher;
}

module.exports = {
  startClipboardMonitor,
  startFileWatcher,
};
