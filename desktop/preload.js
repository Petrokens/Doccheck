const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('doccheckDesktop', {
  isDesktop: true,
});

contextBridge.exposeInMainWorld('doccheckSplash', {
  finished: () => ipcRenderer.send('splash-finished'),
});
