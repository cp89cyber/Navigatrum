const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('navigatrum', {
  navigate: (input) => ipcRenderer.invoke('browser:navigate', input),
  goBack: () => ipcRenderer.send('browser:back'),
  goForward: () => ipcRenderer.send('browser:forward'),
  reload: () => ipcRenderer.send('browser:reload'),
});
