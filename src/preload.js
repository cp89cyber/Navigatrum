const { contextBridge, ipcRenderer } = require('electron');
const { channels } = require('./ipc-channels');

contextBridge.exposeInMainWorld('navigatrum', {
  navigate: (input) => ipcRenderer.invoke(channels.navigate, input),
  goBack: () => ipcRenderer.send(channels.back),
  goForward: () => ipcRenderer.send(channels.forward),
  reload: () => ipcRenderer.send(channels.reload),
  resizeWebview: (payload) => ipcRenderer.invoke(channels.resizeWebview, payload),
  ublock: {
    getStatus: () => ipcRenderer.invoke(channels.ublockStatus),
    check: () => ipcRenderer.invoke(channels.ublockCheck),
    update: (channel) => ipcRenderer.invoke(channels.ublockUpdate, channel),
    openFolder: () => ipcRenderer.invoke(channels.ublockOpenFolder),
    onProgress: (handler) =>
      ipcRenderer.on(channels.ublockProgress, (_event, payload) => handler(payload)),
    onError: (handler) =>
      ipcRenderer.on(channels.ublockError, (_event, payload) => handler(payload)),
    onDone: (handler) =>
      ipcRenderer.on(channels.ublockDone, (_event, payload) => handler(payload)),
  },
});
