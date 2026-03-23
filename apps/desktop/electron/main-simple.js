/**
 * Simple Electron Main Process
 * Clean setup that just loads the Vite dev server
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

// Disable hardware acceleration to prevent GPU errors
app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: false,
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Load from Vite dev server
  const devServerUrl = 'http://localhost:8081';

  console.log(`Loading app from: ${devServerUrl}`);

  mainWindow.loadURL(devServerUrl).catch(err => {
    console.error('Failed to load URL:', err);
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('🚀 Ghost AI Terminal - Starting...');
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
