const { contextBridge, ipcRenderer } = require('electron');

function readApiBaseUrl() {
  const arg = process.argv.find((item) => String(item).startsWith('--doccheck-api='));
  if (arg) return String(arg).slice('--doccheck-api='.length).trim();
  return 'https://petrolenz.onrender.com/api';
}

contextBridge.exposeInMainWorld('doccheckDesktop', {
  isDesktop: true,
  apiBaseUrl: readApiBaseUrl(),
  appVersion: () => ipcRenderer.invoke('app-version'),
});

contextBridge.exposeInMainWorld('doccheckSplash', {
  finished: () => ipcRenderer.send('splash-finished'),
});
