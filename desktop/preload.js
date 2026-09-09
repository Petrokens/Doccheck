const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('doccheckDesktop', {
  isDesktop: true,
  appVersion: () => ipcRenderer.invoke('app-version'),
});

contextBridge.exposeInMainWorld('doccheckSplash', {
  finished: () => ipcRenderer.send('splash-finished'),
});
