import { app, BrowserWindow } from 'electron';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  parsePartitionSmokeMode,
  runPartitionIsolationSmoke,
} from './partition-isolation';
import { attachProviderView, parseProviderViewKind } from './provider-view';

const isPackageSmoke = process.env.INBOXRAIL_PACKAGE_SMOKE === '1';
const providerViewSmokeArgument = process.argv.find((argument) =>
  argument.startsWith('--inboxrail-provider-view-smoke='),
);
const providerViewSmoke = parseProviderViewKind(
  providerViewSmokeArgument?.slice('--inboxrail-provider-view-smoke='.length),
);
const interactiveProviderView = parseProviderViewKind(process.env.INBOXRAIL_P0_PROVIDER);
const providerView = providerViewSmoke ?? interactiveProviderView;
const providerSmokeDiagnosticPath = process.env.INBOXRAIL_PROVIDER_SMOKE_DIAGNOSTIC;
const partitionSmokeArgument = process.argv.find((argument) =>
  argument.startsWith('--inboxrail-partition-smoke='),
);
const partitionSmokeMode = parsePartitionSmokeMode(
  partitionSmokeArgument?.slice('--inboxrail-partition-smoke='.length),
);
const partitionSmokeDiagnosticPath = process.env.INBOXRAIL_PARTITION_SMOKE_DIAGNOSTIC;
const partitionSmokeUserDataPath = process.env.INBOXRAIL_PARTITION_SMOKE_USER_DATA;
const partitionSmokePort = Number.parseInt(process.env.INBOXRAIL_PARTITION_SMOKE_PORT ?? '', 10);

if (partitionSmokeMode && partitionSmokeUserDataPath) {
  app.setPath('userData', partitionSmokeUserDataPath);
}

function recordProviderSmokePhase(phase: string): void {
  if (providerSmokeDiagnosticPath) {
    writeFileSync(
      providerSmokeDiagnosticPath,
      `${JSON.stringify({ phase, providerViewSmoke: providerViewSmoke ?? null })}\n`,
      { encoding: 'utf8', flag: 'a' },
    );
  }
}

function recordPartitionSmokePhase(phase: string, detail?: string): void {
  if (partitionSmokeDiagnosticPath) {
    writeFileSync(
      partitionSmokeDiagnosticPath,
      `${JSON.stringify({ detail: detail ?? null, mode: partitionSmokeMode ?? null, phase })}\n`,
      { encoding: 'utf8', flag: 'a' },
    );
  }
}

recordProviderSmokePhase('module-loaded');

function createWindow(): void {
  recordProviderSmokePhase('create-window');
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
  recordProviderSmokePhase('window-created');

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

  if (providerView) {
    recordProviderSmokePhase('provider-branch');
    let providerSignInLoaded = false;
    let providerSmokeComplete = false;
    let disposeProviderView: (() => void) | undefined;
    const finishProviderSmoke = (exitCode: number): void => {
      if (providerSmokeComplete) {
        return;
      }

      providerSmokeComplete = true;
      disposeProviderView?.();
      window.destroy();
      setImmediate(() => app.exit(exitCode));
    };
    const smokeTimeout = providerViewSmoke
      ? setTimeout(() => {
          if (!providerSmokeComplete) {
            finishProviderSmoke(providerSignInLoaded ? 5 : 3);
          }
        }, 45_000)
      : undefined;
    recordProviderSmokePhase('provider-timeout-armed');

    const attachedProviderView = attachProviderView(window, providerView, () => {
      if (!providerViewSmoke || providerSignInLoaded) {
        return;
      }

      providerSignInLoaded = true;
      recordProviderSmokePhase('provider-sign-in-loaded');
      const captureTimeout = new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('Provider view capture timed out')), 5_000);
      });

      void Promise.race([attachedProviderView.view.webContents.capturePage(), captureTimeout])
        .then((image) => {
          if (smokeTimeout) {
            clearTimeout(smokeTimeout);
          }

          const size = image.getSize();
          recordProviderSmokePhase('provider-capture-complete');
          finishProviderSmoke(
            !image.isEmpty() && size.width > 0 && size.height > 0 && app.isPackaged ? 0 : 4,
          );
        })
        .catch(() => {
          if (smokeTimeout) {
            clearTimeout(smokeTimeout);
          }
          recordProviderSmokePhase('provider-capture-failed');
          finishProviderSmoke(5);
        });
    });
    disposeProviderView = attachedProviderView.dispose;
    recordProviderSmokePhase('provider-view-attached');
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

app
  .whenReady()
  .then(() => {
    recordProviderSmokePhase('app-ready');
    if (partitionSmokeMode) {
      recordPartitionSmokePhase('app-ready');
      if (
        !partitionSmokeUserDataPath ||
        !Number.isInteger(partitionSmokePort) ||
        partitionSmokePort < 1024 ||
        partitionSmokePort > 65535
      ) {
        recordPartitionSmokePhase('configuration-invalid');
        app.exit(7);
        return;
      }

      void runPartitionIsolationSmoke(partitionSmokeMode, partitionSmokePort)
        .then(() => {
          recordPartitionSmokePhase('partition-isolation-passed');
          app.exit(app.isPackaged ? 0 : 2);
        })
        .catch((error: unknown) => {
          recordPartitionSmokePhase(
            'partition-isolation-failed',
            error instanceof Error ? error.message : 'Unknown failure',
          );
          app.exit(7);
        });
      return;
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0 && !isPackageSmoke && !providerViewSmoke) {
        createWindow();
      }
    });
  })
  .catch(() => {
    recordProviderSmokePhase('startup-failed');
    app.exit(6);
  });

app.on('window-all-closed', () => {
  if (!providerViewSmoke && !partitionSmokeMode) {
    app.quit();
  }
});
