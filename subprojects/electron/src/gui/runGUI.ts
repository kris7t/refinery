/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import path from 'node:path';

import { app, BrowserWindow, nativeTheme } from 'electron';

import startServer from '../server/startServer';
import getLogger from '../utils/getLogger';
import { isMac, isWindows } from '../utils/platform';

import getTheme, { attachNativeThemeHandler } from './getTheme';

const logger = getLogger('gui.runGUI');

function createWindow(pageURL: string): BrowserWindow {
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

  window.once('ready-to-show', () => {
    window.show();
    if (process.isDev) {
      window.webContents.openDevTools();
    }
  });

  window
    .loadURL(pageURL)
    .catch((error) => logger.error({ err: error }, 'Failed to load webpage'));

  return window;
}

export default async function runGUI() {
  app.on('window-all-closed', () => {
    if (!isMac) {
      app.quit();
    }
  });

  const { root: pageURL, backend } = await startServer();

  // `startServer()` waits for `app.whenReady()` internally, so this is safe to do here.
  attachNativeThemeHandler();

  // Only start the backend once the UI is ready to show to avoid CPU contention
  // slowing down time to UI interactivity.
  await new Promise<void>((resolve, reject) => {
    const window = createWindow(pageURL);
    window.once('ready-to-show', () => {
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow(pageURL);
        }
      });

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
