/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

/* eslint-disable-next-line import/no-unresolved --
  This module is only available during bundling.
*/
import { ThemeSource } from '@tools.refinery/frontend/RefineryContextBridge';
import {
  BrowserWindow,
  ipcMain,
  nativeTheme,
  type TitleBarOverlay,
} from 'electron';

import getLogger from './utils/getLogger';
import { isMac, isWindows } from './utils/platform';

const logger = getLogger('getTheme');

interface Theme {
  backgroundColor: string;
  accentColor: string;
  titleBarOverlay: TitleBarOverlay;
}

export default function getTheme(shouldUseDarkColors: boolean): Theme {
  if (shouldUseDarkColors) {
    const backgroundColor = '#21252b';
    return {
      backgroundColor,
      accentColor: '#56b6c2',
      titleBarOverlay: {
        color: backgroundColor,
        symbolColor: '#ebebff',
      },
    };
  }
  const backgroundColor = '#f5f5f5';
  return {
    backgroundColor,
    accentColor: '#038a99',
    titleBarOverlay: {
      color: backgroundColor,
      symbolColor: '#19202b',
    },
  };
}

nativeTheme.on('updated', () => {
  const { backgroundColor, accentColor, titleBarOverlay } = getTheme(
    nativeTheme.shouldUseDarkColors,
  );
  const { themeSource } = nativeTheme;
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('refinery:themeSourceChanged', themeSource);
    window.setBackgroundColor(backgroundColor);
    if (isWindows) {
      window.setAccentColor(accentColor);
    }
    if (!isMac) {
      window.setTitleBarOverlay(titleBarOverlay);
    }
  }
});

ipcMain.handle(
  'refinery:getThemeSource',
  (): ThemeSource => nativeTheme.themeSource,
);

ipcMain.on('refinery:setThemeSource', (_event, rawThemeSource: unknown) => {
  const themeSource = ThemeSource.safeParse(rawThemeSource);
  if (themeSource.success) {
    nativeTheme.themeSource = themeSource.data;
  } else {
    logger.error({ err: themeSource.error }, 'Failed to parse ThemeSource');
  }
});
