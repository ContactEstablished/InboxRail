import { BrowserWindow, WebContentsView, type Session } from 'electron';
import { createServer, type Server } from 'node:http';

export type PartitionSmokeMode = 'seed' | 'verify';

interface FixtureAccount {
  identity: string;
  partition: string;
}

interface FixtureReport {
  afterCookie: string | null;
  afterLocalStorage: string | null;
  beforeCookie: string | null;
  beforeLocalStorage: string | null;
  identity: string;
  mode: PartitionSmokeMode;
}

interface FixtureServer {
  close: () => Promise<void>;
  origin: string;
  waitForReport: (identity: string) => Promise<FixtureReport>;
}

const FIXTURE_COOKIE = 'inboxrailFixtureIdentity';
const FIXTURE_LOCAL_STORAGE = 'inboxrailFixtureIdentity';
const REPORT_TIMEOUT_MS = 10_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fixtureAccounts: readonly FixtureAccount[] = [
  {
    identity: 'alpha',
    partition: 'persist:inboxrail-account-11111111-1111-4111-8111-111111111111',
  },
  {
    identity: 'beta',
    partition: 'persist:inboxrail-account-22222222-2222-4222-8222-222222222222',
  },
];

const fixtureScript = `
(() => {
  const parameters = new URLSearchParams(window.location.search);
  const identity = parameters.get('identity');
  const mode = parameters.get('mode');
  const cookieName = ${JSON.stringify(FIXTURE_COOKIE)};
  const storageKey = ${JSON.stringify(FIXTURE_LOCAL_STORAGE)};
  const readCookie = () => {
    const prefix = cookieName + '=';
    const match = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
    return match ? decodeURIComponent(match.slice(prefix.length)) : null;
  };

  const beforeLocalStorage = localStorage.getItem(storageKey);
  const beforeCookie = readCookie();
  if (mode === 'seed') {
    localStorage.setItem(storageKey, identity);
    document.cookie = cookieName + '=' + encodeURIComponent(identity) + '; Path=/; Max-Age=86400; SameSite=Strict';
  }

  const report = {
    afterCookie: readCookie(),
    afterLocalStorage: localStorage.getItem(storageKey),
    beforeCookie,
    beforeLocalStorage,
    identity,
    mode,
  };

  fetch('/report', {
    body: JSON.stringify(report),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  }).catch(() => undefined);
})();
`;

function assertPartitionName(partition: string): void {
  const prefix = 'persist:inboxrail-account-';
  if (!partition.startsWith(prefix) || !UUID_PATTERN.test(partition.slice(prefix.length))) {
    throw new Error(`Invalid fixture partition name: ${partition}`);
  }
}

function isFixtureReport(value: unknown): value is FixtureReport {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const report = value as Record<string, unknown>;
  const nullableString = (candidate: unknown) => candidate === null || typeof candidate === 'string';
  return (
    nullableString(report.afterCookie) &&
    nullableString(report.afterLocalStorage) &&
    nullableString(report.beforeCookie) &&
    nullableString(report.beforeLocalStorage) &&
    (report.identity === 'alpha' || report.identity === 'beta') &&
    (report.mode === 'seed' || report.mode === 'verify')
  );
}

function assertReport(report: FixtureReport, account: FixtureAccount, mode: PartitionSmokeMode): void {
  if (report.identity !== account.identity || report.mode !== mode) {
    throw new Error(`Fixture report context mismatch for ${account.identity}`);
  }

  const expectedBefore = mode === 'seed' ? null : account.identity;
  if (
    report.beforeCookie !== expectedBefore ||
    report.beforeLocalStorage !== expectedBefore ||
    report.afterCookie !== account.identity ||
    report.afterLocalStorage !== account.identity
  ) {
    throw new Error(`Partition state assertion failed for ${account.identity} during ${mode}`);
  }
}

async function assertSessionCookie(
  electronSession: Session,
  origin: string,
  identity: string,
): Promise<void> {
  const cookies = await electronSession.cookies.get({ name: FIXTURE_COOKIE, url: origin });
  if (cookies.length !== 1 || cookies[0]?.value !== identity) {
    throw new Error(`Session cookie assertion failed for ${identity}`);
  }
}

function fixtureHtml(): string {
  return '<!doctype html><html><head><meta charset="utf-8"><title>Partition fixture</title></head><body><script src="/fixture.js"></script></body></html>';
}

async function startFixtureServer(port: number): Promise<FixtureServer> {
  const pendingReports = new Map<
    string,
    { reject: (error: Error) => void; resolve: (report: FixtureReport) => void; timeout: NodeJS.Timeout }
  >();

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
    const headers = {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'",
      'Cross-Origin-Resource-Policy': 'same-origin',
    };

    if (request.method === 'GET' && requestUrl.pathname === '/fixture') {
      response.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' });
      response.end(fixtureHtml());
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/fixture.js') {
      response.writeHead(200, { ...headers, 'Content-Type': 'text/javascript; charset=utf-8' });
      response.end(fixtureScript);
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/report') {
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk: string) => {
        body += chunk;
        if (body.length > 4096) {
          request.destroy();
        }
      });
      request.on('end', () => {
        try {
          const report: unknown = JSON.parse(body);
          if (!isFixtureReport(report)) {
            throw new Error('Invalid fixture report');
          }

          const pending = pendingReports.get(report.identity);
          if (!pending) {
            throw new Error('Unexpected fixture report');
          }

          clearTimeout(pending.timeout);
          pendingReports.delete(report.identity);
          pending.resolve(report);
          response.writeHead(204, headers);
          response.end();
        } catch {
          response.writeHead(400, headers);
          response.end();
        }
      });
      return;
    }

    response.writeHead(404, headers);
    response.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  return {
    close: async () => {
      for (const pending of pendingReports.values()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Fixture server closed before report'));
      }
      pendingReports.clear();
      await closeServer(server);
    },
    origin: `http://127.0.0.1:${port}`,
    waitForReport: (identity) =>
      new Promise<FixtureReport>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pendingReports.delete(identity);
          reject(new Error(`Timed out waiting for ${identity} fixture report`));
        }, REPORT_TIMEOUT_MS);
        pendingReports.set(identity, { reject, resolve, timeout });
      }),
  };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export function parsePartitionSmokeMode(value: string | undefined): PartitionSmokeMode | undefined {
  return value === 'seed' || value === 'verify' ? value : undefined;
}

export async function runPartitionIsolationSmoke(
  mode: PartitionSmokeMode,
  port: number,
): Promise<void> {
  for (const account of fixtureAccounts) {
    assertPartitionName(account.partition);
  }

  const fixtureServer = await startFixtureServer(port);
  const window = new BrowserWindow({
    height: 320,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    width: 480,
  });

  try {
    for (const account of fixtureAccounts) {
      const view = new WebContentsView({
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          partition: account.partition,
          sandbox: true,
          webSecurity: true,
          webviewTag: false,
        },
      });
      window.contentView.addChildView(view);
      view.setBounds({ height: 300, width: 460, x: 0, y: 0 });
      view.webContents.session.setPermissionCheckHandler(() => false);
      view.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => {
        callback(false);
      });
      view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

      try {
        const reportPromise = fixtureServer.waitForReport(account.identity);
        const fixtureUrl = new URL('/fixture', fixtureServer.origin);
        fixtureUrl.searchParams.set('identity', account.identity);
        fixtureUrl.searchParams.set('mode', mode);
        await view.webContents.loadURL(fixtureUrl.toString());
        const report = await reportPromise;
        assertReport(report, account, mode);
        await assertSessionCookie(view.webContents.session, fixtureServer.origin, account.identity);
        await view.webContents.session.flushStorageData();
      } finally {
        window.contentView.removeChildView(view);
        if (!view.webContents.isDestroyed()) {
          view.webContents.close();
        }
      }
    }
  } finally {
    if (!window.isDestroyed()) {
      window.destroy();
    }
    await fixtureServer.close();
  }
}
