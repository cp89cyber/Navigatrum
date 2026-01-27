const { contextBridge, ipcRenderer } = require('electron');
const { channels } = require('./ipc-channels');

contextBridge.exposeInMainWorld('navigatrum', {
  navigate: (input) => ipcRenderer.invoke(channels.navigate, input),
  goBack: () => ipcRenderer.send(channels.back),
  goForward: () => ipcRenderer.send(channels.forward),
  reload: () => ipcRenderer.send(channels.reload),
  resizeWebview: (payload) => ipcRenderer.invoke(channels.resizeWebview, payload),
});
