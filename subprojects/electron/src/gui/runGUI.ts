/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import path from 'node:path';

import { app, BrowserWindow, nativeTheme } from 'electron';
import z from 'zod/v4';

import enableWebContentsLogger from '../logger/enableWebContentsLogger';
import getLogger from '../logger/getLogger';
import startServer from '../server/startServer';
import settings from '../settings';
import hardenWebContents from '../utils/hardenWebContents';
import { isMac, isWindows } from '../utils/platform';

import OpenRequestHandler from './OpenRequestHandler';
import { createWindowStore } from './WindowStore';
import attachFileIOHandlers, { focusWindowForFile } from './fileIO';
import getTheme, {
  attachNativeThemeHandler,
  attachWindowThemeHandler,
} from './getTheme';
import resolveFileArguments, {
  resolveFileArgument,
} from './resolveFileArguments';

const logger = getLogger('gui.runGUI');

const AdditionalData = z.object({
  filePaths: z.array(z.string()),
});

const openRequests = new OpenRequestHandler();

function createWindow(
  pageURL: string,
  allowedOrigins: string[],
  filePath?: string,
): BrowserWindow {
  const { backgroundColor, accentColor, titleBarOverlay } = getTheme(
    nativeTheme.shouldUseDarkColors,
  );

  const window = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'gui', 'preload.js'),
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
  createWindowStore(window).setFilePath(filePath);
  attachWindowThemeHandler(window);

  window.once('ready-to-show', () => {
    window.show();
    if (process.isDev) {
      window.webContents.openDevTools();
    }
  });

  const { webContents } = window;

  hardenWebContents(webContents, allowedOrigins, [
    'clipboard-read',
    'clipboard-sanitized-write',
    'fileSystem',
  ]);
  enableWebContentsLogger(webContents);

  window
    .loadURL(pageURL)
    .catch((error) => logger.error({ err: error }, 'Failed to load webpage'));

  return window;
}

export default async function runGUI() {
  if (isMac) {
    app.on('open-file', (event, filePath) => {
      event.preventDefault();
      const resolvedPath = resolveFileArgument(filePath, process.cwd());
      if (resolvedPath !== undefined) {
        openRequests.openInitial(resolvedPath);
      }
    });
    app.on('open-url', (event, url) => {
      if (!/^file:/i.test(url)) {
        return;
      }
      event.preventDefault();
      const resolvedPath = resolveFileArgument(url, process.cwd());
      if (resolvedPath !== undefined) {
        openRequests.openInitial(resolvedPath);
      }
    });
  }

  const args = process.argv.slice(process.defaultApp ? 2 : 1);
  const filePaths = resolveFileArguments(args, process.cwd());
  if (!app.requestSingleInstanceLock({ filePaths })) {
    app.quit();
    return;
  }
  for (const filePath of filePaths) {
    openRequests.openInitial(filePath);
  }
  app.on('second-instance', (_event, _argv, _workingDirectory, rawData) => {
    const data = AdditionalData.safeParse(rawData);
    if (!data.success) {
      logger.error({ err: data.error }, 'Failed to parse second instance data');
      return;
    }
    if (data.data.filePaths.length === 0) {
      openRequests.open();
    } else {
      for (const filePath of data.data.filePaths) {
        openRequests.open(filePath);
      }
    }
  });

  app.on('window-all-closed', () => {
    if (!isMac) {
      app.quit();
    }
  });

  const [{ root: pageURL, backend, allowedOrigins }] = await Promise.all([
    startServer(),
    settings.readSettings(),
  ]);

  // `startServer()` waits for `app.whenReady()` internally, so this is safe to do here.
  attachFileIOHandlers();
  attachNativeThemeHandler();

  const openWindow = (filePath: string | undefined) => {
    if (filePath !== undefined) {
      const existingWindow = focusWindowForFile(filePath);
      if (existingWindow !== undefined) {
        return existingWindow;
      }
    }
    return createWindow(pageURL, allowedOrigins, filePath);
  };

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openRequests.open();
    }
  });

  const [window] = openRequests.initialize(openWindow);

  // Only start the backend once the UI is ready to show to avoid CPU contention
  // slowing down time to UI interactivity.
  await new Promise<void>((resolve, reject) => {
    window.once('ready-to-show', () => {
      resolve();
    });
    window.webContents.on(
      'did-fail-load',
      (_event, _errorCode, errorDescription) => {
        reject(new Error(errorDescription));
      },
    );
  });

  await backend.start();
}
