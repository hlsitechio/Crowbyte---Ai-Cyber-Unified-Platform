/**
 * CrowByt - Electron Main Process
 * AI-Powered Cybersecurity Terminal by HLSITech
 * https://crowbyt.io
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';

// __dirname is available in CommonJS (ts-node default)

let mainWindow: BrowserWindow | null;

function createWindow(): void {
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

  console.log(`🚀 Loading app from: ${devServerUrl}`);

  mainWindow.loadURL(devServerUrl).catch((err) => {
    console.error('❌ Failed to load URL:', err);
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
  console.log('\n' + '='.repeat(70));
  console.log('🦅 CrowByt - AI-Powered Cybersecurity Terminal');
  console.log('   by HLSITech | https://crowbyt.io');
  console.log('='.repeat(70) + '\n');

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
