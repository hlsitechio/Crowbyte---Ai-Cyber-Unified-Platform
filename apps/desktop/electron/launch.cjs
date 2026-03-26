#!/usr/bin/env node
/**
 * Electron Launcher Script
 * This script removes the ELECTRON_RUN_AS_NODE environment variable
 * before launching Electron, which is required when running from
 * Electron-based IDEs like VS Code.
 */

const { spawn } = require('child_process');
const path = require('path');

// Get the electron executable path
const electronPath = require('electron');

// Remove the environment variable that causes Electron to run as Node
// And set NODE_ENV to development for proper CSP settings
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.NODE_ENV = 'development';

console.log('🚀 Launching CrowByte...');
console.log('Electron path:', electronPath);

// Spawn electron with our main script
const projectRoot = path.resolve(__dirname, '..');
const child = spawn(electronPath, [projectRoot], {
  stdio: 'inherit',
  env: env,
  windowsHide: false
});

child.on('close', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to launch Electron:', err);
  process.exit(1);
});
