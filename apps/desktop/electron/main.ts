/**
 * CrowByte - Electron Main Process
 * AI-Powered Cybersecurity Terminal by HLSITech
 * https://crowbyte.io
 *
 * Discord-style installer: silent NSIS → app handles onboarding on first run
 */

import { app, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Resolve icon path — works in both dev and packaged
const iconPath = path.join(__dirname, '../public/icon.png');
const appIcon = fs.existsSync(iconPath)
  ? nativeImage.createFromPath(iconPath)
  : undefined;

let mainWindow: BrowserWindow | null;

// ─── First-Run Detection ────────────────────────────────────────────────────

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'crowbyte-config.json');
}

function isFirstRun(): boolean {
  // Check squirrel first-run flag OR our own config file
  if (process.argv.includes('--squirrel-firstrun')) return true;
  try {
    const config = JSON.parse(fs.readFileSync(getConfigPath(), 'utf-8'));
    return !config.onboardingComplete;
  } catch {
    return true; // No config file = first run
  }
}

function markOnboardingComplete(): void {
  const configPath = getConfigPath();
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch { /* new file */ }
  config.onboardingComplete = true;
  config.onboardingCompletedAt = new Date().toISOString();
  config.version = app.getVersion();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// ─── Onboarding Window (frameless, branded) ─────────────────────────────────

function createOnboardingWindow(): void {
  mainWindow = new BrowserWindow({
    width: 660,
    height: 500,
    frame: false,
    resizable: false,
    transparent: true,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: appIcon,
    backgroundColor: '#00000000',
    titleBarStyle: 'hidden',
    skipTaskbar: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev') || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:8081/#/onboarding');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/onboarding' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Main App Window ────────────────────────────────────────────────────────

function createMainWindow(): void {
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
    icon: appIcon,
  });

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev') || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:8081');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── IPC: Onboarding → Main transition ──────────────────────────────────────

import { ipcMain } from 'electron';

ipcMain.handle('onboarding:complete', () => {
  markOnboardingComplete();
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
  createMainWindow();
  return { success: true };
});

ipcMain.handle('onboarding:skip', () => {
  markOnboardingComplete();
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
  createMainWindow();
  return { success: true };
});

// ─── App Lifecycle ──────────────────────────────────────────────────────────

// ─── Single Instance Lock ────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[-] Another instance is already running. Exiting.');
  app.quit();
}

app.on('second-instance', () => {
  // Focus existing window when user tries to launch another instance
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  // Set dock/taskbar icon explicitly on Linux
  if (appIcon && process.platform === 'linux') {
    app.setBadgeCount(0); // forces icon refresh on some DEs
  }

  console.log('\n' + '='.repeat(70));
  console.log('  CrowByte - AI-Powered Cybersecurity Terminal');
  console.log('  by HLSITech | https://crowbyte.io');
  console.log('='.repeat(70) + '\n');

  if (isFirstRun()) {
    console.log('[*] First run detected — launching onboarding');
    createOnboardingWindow();
  } else {
    console.log('[*] Returning user — launching main app');
    createMainWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
