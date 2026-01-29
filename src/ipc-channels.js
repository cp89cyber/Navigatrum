const channels = {
  navigate: 'browser:navigate',
  back: 'browser:back',
  forward: 'browser:forward',
  reload: 'browser:reload',
  resizeWebview: 'browser:resize-webview',
  ublockStatus: 'ublock:status',
  ublockCheck: 'ublock:check',
  ublockUpdate: 'ublock:update',
  ublockOpenFolder: 'ublock:open-folder',
  ublockProgress: 'ublock:update-progress',
  ublockError: 'ublock:update-error',
  ublockDone: 'ublock:update-done',
};

module.exports = {
  channels,
};
