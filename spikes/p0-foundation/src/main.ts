import { app, BrowserWindow } from 'electron';
import path from 'node:path';

const isPackageSmoke = process.env.INBOXRAIL_PACKAGE_SMOKE === '1';

function createWindow(): void {
  const window = new BrowserWindow({
    width: 960,
    height: 640,
    show: !isPackageSmoke,
    backgroundColor: '#111827',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
    if (isPackageSmoke) {
      console.error(`Package smoke load failed (${errorCode}): ${errorDescription}`);
      app.exit(1);
    }
  });

  window.webContents.once('did-finish-load', () => {
    if (isPackageSmoke) {
      app.exit(app.isPackaged ? 0 : 2);
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && !isPackageSmoke) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
