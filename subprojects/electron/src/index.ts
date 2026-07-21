/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  net,
  protocol,
} from 'electron';

import BackendManager from './BackendManager';
import getTheme from './getTheme';
import cleanup, { onCleanup } from './utils/cleanup';
import getFreePort from './utils/getFreePort';
import getPathToServe from './utils/getPathToServe';
import logger from './utils/logger';
import { isLinux, isMac, isWindows } from './utils/platform';

const appName = process.isDev
  ? 'tools.refinery.RefineryDev'
  : 'tools.refinery.Refinery';
app.setName(appName);
if (isLinux) {
  app.setDesktopName(appName);
}
if (isWindows) {
  app.setAppUserModelId(appName);
}

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
      codeCache: true,
      allowExtensions: true,
    },
  },
]);

function createWindow(pageURL: string) {
  const { backgroundColor, accentColor, titleBarOverlay } = getTheme(
    nativeTheme.shouldUseDarkColors,
  );

  const window = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: process.isDev,
    },
    show: false,
    autoHideMenuBar: true,
    title: 'Refinery',
    backgroundColor,
    ...(isWindows ? {} : { accentColor }),
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac ? {} : { titleBarOverlay }),
  });

  window.once('ready-to-show', () => {
    window.show();
    if (process.isDev) {
      window.webContents.openDevTools();
    }
  });

  window
    .loadURL(pageURL)
    .catch((error) => logger.error({ err: error }, 'Failed to load webpage'));
}

async function run() {
  let pageURL = 'app://refinery/';
  const allowedOrigins = ['app://refinery'];

  const backendPort = await getFreePort();

  // To enable tree-shaking `./FrontendManager`, we can't use a reference to `isDev` here.
  if (process.isDev && getPathToServe('/') === undefined) {
    let frontendPort;
    do {
      frontendPort = await getFreePort();
    } while (frontendPort === backendPort);
    const { default: FrontedManager } = await import('./FrontedManager');
    const frontend = new FrontedManager(
      frontendPort,
      BackendManager.hostname,
      backendPort,
    );
    pageURL = frontend.address;
    allowedOrigins.push(frontend.origin);
    onCleanup(() => frontend.stop());
    await frontend.start();
  }

  const backend = new BackendManager(backendPort, allowedOrigins);
  onCleanup(() => backend.stop());
  const backendReady = backend.start();
  backendReady.catch(() => {
    // Attach a no-op exception handler so that the exception is not counted as unhandled.
    // We'll await the original `backendReady` promise later to extract the exception from it.
  });
  const securityHeaders = {
    'Content-Security-Policy':
      "default-src 'none'; " +
      "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; " +
      // CodeMirror needs inline styles, see e.g.,
      // https://discuss.codemirror.net/t/inline-styles-and-content-security-policy/1311/2
      "style-src 'self' 'unsafe-inline'; " +
      // Use 'data:' for displaying inline SVG backgrounds and blob for rendering SVG.
      "img-src 'self' data: blob:; " +
      "font-src 'self'; " +
      // Fetch data:application/octet-stream;base64 URIs to unpack compressed URL fragments.
      `connect-src 'self' ${backend.httpOrigin} ${backend.webSocketOrigin} data:; ` +
      "manifest-src 'self'; " +
      "worker-src 'self' blob:;",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin',
    // Enable cross-origin isolation, https://web.dev/cross-origin-isolation-guide/
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };

  backend.on('health-changed', (healthy) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('refinery:serverStateChanged', healthy);
    }
  });

  ipcMain.handle('refinery:getBackendConfig', () => backend.backendConfig);

  ipcMain.handle('refinery:getServerState', (): boolean => backend.healthy);

  await app.whenReady();

  protocol.handle('app', async (request) => {
    const { host, pathname } = new URL(request.url);
    if (host === 'refinery') {
      const pathToServe = getPathToServe(pathname);
      if (pathToServe) {
        let response: Response;
        try {
          response = await net.fetch(pathToFileURL(pathToServe).toString());
        } catch (error) {
          logger.error({ pathToServe, err: error }, 'Error while serving request');
          return new Response('<h1>500 Internal Server Error</h1>', {
            status: 500,
            statusText: 'Internal Server Error',
            headers: {
              'Content-Type': 'text/html',
            },
          });
        }
        if (!response.ok) {
          logger.error(
            {
              pathToServe,
              status: response.status,
              statusText: response.statusText,
            },
            'Request failed',
          );
        }
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => (headers[key] = value));
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...headers,
            ...securityHeaders,
          },
        });
      }
    }
    return new Response('<h1>400 Bad Request</h1>', {
      status: 400,
      statusText: 'Bad Request',
      headers: {
        'Content-Type': 'text/html',
      },
    });
  });

  createWindow(pageURL);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(pageURL);
    }
  });

  await backendReady;
}

run().catch((error) => {
  logger.error({ err: error }, 'Fatal error during startup');
  cleanup();
  process.exit(-1);
});
