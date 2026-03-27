/**
 * CrowByte - Electron Main Process
 * AI-Powered Cybersecurity Terminal by HLSITech
 * https://crowbyte.io
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';

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

  // Dev server in development, built files in production
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev') || !app.isPackaged;

  if (isDev) {
    const devServerUrl = 'http://localhost:8081';
    console.log(`[*] Loading from dev server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl).catch((err) => {
      console.error('[!] Failed to load dev server:', err);
    });
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log(`[*] Loading from built files: ${indexPath}`);
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[!] Failed to load index.html:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('\n' + '='.repeat(70));
  console.log('  CrowByte - AI-Powered Cybersecurity Terminal');
  console.log('  by HLSITech | https://crowbyte.io');
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
