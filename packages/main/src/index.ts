import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { URL } from 'url';

import { launch } from './core/launch';
import { install } from '@core/install/fabric';
// import { installJRE } from './core/install/java';

import './securityRestrictions';
// import { installJRE } from './core/install/java';

const isSingleInstance = app.requestSingleInstanceLock();

if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}

if (import.meta.env.DEV) {
  app
    .whenReady()
    .then(() => import('electron-devtools-installer'))
    // @ts-expect-error
    .then(({ default: installExtension, VUEJS3_DEVTOOLS }) =>
      // @ts-expect-error
      installExtension(VUEJS3_DEVTOOLS, {
        loadExtensionOptions: {
          allowFileAccess: true,
        },
      })
    )
    .catch((e) => console.error('Failed install extension:', e));
}

let mainWindow: BrowserWindow | null = null;

export const createWindow = async () => {
  mainWindow = new BrowserWindow({
    show: false, // Use 'ready-to-show' event to show window

    width: 900,
    height: 900 * (9 / 16),

    title: `${app.getName()} v${app.getVersion()}`,

    vibrancy: 'sidebar',
    titleBarStyle: 'hidden',

    webPreferences: {
      preload: join(__dirname, '../../preload/dist/index.cjs'),
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  const pageUrl =
    import.meta.env.DEV && import.meta.env.VITE_DEV_SERVER_URL !== undefined
      ? import.meta.env.VITE_DEV_SERVER_URL
      : new URL(
          '../renderer/dist/index.html',
          'file://' + __dirname
        ).toString();

  await mainWindow.loadURL(pageUrl);
};

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app
  .whenReady()
  .then(createWindow)
  .then(() => {
    ipcMain.on('test', async () => {
      // await installJRE();
      await install(
        'testReleaseM1',
        {
          vanilla: '1.18.2',
          loader: '0.13.3',
        },
        true
      );

      console.log('{{{{{ # }}}}} Launching...');

      await launch('testReleaseM1');
    });
  })
  .catch((e) => console.error('Failed to create window:', e));

if (import.meta.env.PROD) {
  app
    .whenReady()
    .then(() => import('electron-updater'))
    .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
    .catch((e) => console.error('Failed to check for updates:', e));
}
