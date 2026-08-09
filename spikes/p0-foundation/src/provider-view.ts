import { WebContentsView, type BrowserWindow, type WebPreferences } from 'electron';

export type ProviderViewKind = 'gmail' | 'microsoft';

export interface AttachedProviderView {
  dispose: () => void;
  view: WebContentsView;
}

const TAB_STRIP_HEIGHT = 72;

const providerPolicies = {
  gmail: {
    entryUrl: 'https://accounts.google.com/AccountChooser?continue=https%3A%2F%2Fmail.google.com%2F',
    allowedHostSuffixes: ['google.com', 'googleusercontent.com', 'gstatic.com'],
    signInHosts: ['accounts.google.com'],
  },
  microsoft: {
    entryUrl: 'https://outlook.office.com/mail/',
    allowedHostSuffixes: [
      'live.com',
      'microsoft.com',
      'microsoftonline.com',
      'msauth.net',
      'msftauth.net',
      'office.com',
      'office365.com',
    ],
    signInHosts: ['account.live.com', 'login.live.com', 'login.microsoftonline.com'],
  },
} as const;

function hostMatches(hostname: string, suffix: string): boolean {
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

function isAllowedNavigation(provider: ProviderViewKind, rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);

    return (
      url.protocol === 'https:' &&
      providerPolicies[provider].allowedHostSuffixes.some((suffix) =>
        hostMatches(url.hostname, suffix),
      )
    );
  } catch {
    return false;
  }
}

function isProviderSignIn(provider: ProviderViewKind, rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return (
      url.protocol === 'https:' &&
      providerPolicies[provider].signInHosts.some((host) => url.hostname === host)
    );
  } catch {
    return false;
  }
}

function createRemoteWebPreferences(provider: ProviderViewKind): WebPreferences {
  return {
    allowRunningInsecureContent: false,
    contextIsolation: true,
    experimentalFeatures: false,
    nodeIntegration: false,
    nodeIntegrationInSubFrames: false,
    nodeIntegrationInWorker: false,
    partition: `p0-secure-view-${provider}`,
    plugins: false,
    sandbox: true,
    webSecurity: true,
    webviewTag: false,
  };
}

function assertSecurePreferences(preferences: WebPreferences): void {
  const unsafe =
    preferences.allowRunningInsecureContent !== false ||
    preferences.contextIsolation !== true ||
    preferences.experimentalFeatures !== false ||
    preferences.nodeIntegration !== false ||
    preferences.nodeIntegrationInSubFrames !== false ||
    preferences.nodeIntegrationInWorker !== false ||
    preferences.plugins !== false ||
    preferences.preload !== undefined ||
    preferences.sandbox !== true ||
    preferences.webSecurity !== true ||
    preferences.webviewTag !== false;

  if (unsafe) {
    throw new Error('Remote provider view was created with unsafe web preferences');
  }
}

function applyViewBounds(window: BrowserWindow, view: WebContentsView): void {
  const contentSize = window.getContentSize();
  const width = contentSize[0] ?? 0;
  const height = contentSize[1] ?? 0;

  view.setBounds({
    x: 0,
    y: TAB_STRIP_HEIGHT,
    width: Math.max(0, width),
    height: Math.max(0, height - TAB_STRIP_HEIGHT),
  });
}

export function parseProviderViewKind(value: string | undefined): ProviderViewKind | undefined {
  return value === 'gmail' || value === 'microsoft' ? value : undefined;
}

export function attachProviderView(
  window: BrowserWindow,
  provider: ProviderViewKind,
  onSignInRendered?: () => void,
): AttachedProviderView {
  const webPreferences = createRemoteWebPreferences(provider);
  assertSecurePreferences(webPreferences);

  const view = new WebContentsView({
    webPreferences,
  });

  window.contentView.addChildView(view);
  applyViewBounds(window, view);

  const resize = () => applyViewBounds(window, view);
  window.on('resize', resize);

  view.webContents.session.setPermissionCheckHandler(() => false);
  view.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  view.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedNavigation(provider, navigationUrl)) {
      event.preventDefault();
    }
  });
  view.webContents.on('did-finish-load', () => {
    if (isProviderSignIn(provider, view.webContents.getURL())) {
      onSignInRendered?.();
    }
  });

  let disposed = false;
  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    window.removeListener('resize', resize);
    if (!window.isDestroyed()) {
      window.contentView.removeChildView(view);
    }
    if (!view.webContents.isDestroyed()) {
      view.webContents.close();
    }
  };

  window.once('close', dispose);

  void view.webContents.loadURL(providerPolicies[provider].entryUrl);

  return { dispose, view };
}
