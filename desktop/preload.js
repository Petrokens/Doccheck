const { contextBridge, ipcRenderer } = require('electron');

const DEFAULT_API = 'https://doccheck-3qw4.onrender.com/api';

function readApiBaseUrl() {
  const arg = process.argv.find((item) => String(item).startsWith('--doccheck-api='));
  if (arg) {
    const value = String(arg).slice('--doccheck-api='.length).trim();
    if (value) return value;
  }
  return DEFAULT_API;
}

contextBridge.exposeInMainWorld('doccheckDesktop', {
  isDesktop: true,
  apiBaseUrl: readApiBaseUrl(),
  appVersion: () => ipcRenderer.invoke('app-version'),
});

contextBridge.exposeInMainWorld('doccheckSplash', {
  finished: () => ipcRenderer.send('splash-finished'),
});
