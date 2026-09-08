const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('petrolenzDesktop', {
  isDesktop: true,
});
