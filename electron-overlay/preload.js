const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeOverlay: () => ipcRenderer.send('close-overlay'),
  focusOverlay: () => ipcRenderer.send('focus-overlay')
});

// Forward overlay transaction messages to renderer
ipcRenderer.on('overlay:transaction', (event, payload) => {
  try {
    window.dispatchEvent(new CustomEvent('overlay:transaction', { detail: payload }));
  } catch (e) {
    // ignore
  }
});

contextBridge.exposeInMainWorld('electronOverlay', {
  onTransaction: (cb) => {
    window.addEventListener('overlay:transaction', (ev) => {
      try { cb(ev.detail); } catch (e) { /* ignore */ }
    });
  }
});
