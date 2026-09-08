const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petrolenzDesktop', {
  isDesktop: true,
});

contextBridge.exposeInMainWorld('petrolenzSplash', {
  finished: () => ipcRenderer.send('splash-finished'),
});
