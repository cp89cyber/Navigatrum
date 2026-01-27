const path = require('node:path');
const { app, BrowserWindow, ipcMain, webContents } = require('electron');

const { channels } = require('./ipc-channels');
const { normalizeUserUrl } = require('./url-utils');

let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#111827',
    title: 'Navigatrum',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer/index.html'));
  win.on('closed', () => {
    mainWindow = null;
  });

  mainWindow = win;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle(channels.navigate, (_event, input) => {
  return normalizeUserUrl(input);
});

ipcMain.handle(channels.resizeWebview, (_event, payload) => {
  const { webContentsId, width, height } = payload || {};
  if (!Number.isInteger(webContentsId)) {
    return false;
  }

  const guest = webContents.fromId(webContentsId);
  if (!guest || typeof guest.setSize !== 'function') {
    return false;
  }

  const safeWidth = Math.max(1, Math.floor(Number(width) || 0));
  const safeHeight = Math.max(1, Math.floor(Number(height) || 0));

  guest.setSize({ width: safeWidth, height: safeHeight });
  return true;
});

ipcMain.on(channels.back, () => {
  // Reserved for future navigation orchestration from the main process.
});

ipcMain.on(channels.forward, () => {
  // Reserved for future navigation orchestration from the main process.
});

ipcMain.on(channels.reload, () => {
  // Reserved for future navigation orchestration from the main process.
});
