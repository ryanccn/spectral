import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  versions: process.versions,
  platform: process.platform,
  test: () => {
    ipcRenderer.send('test');
  },
});
