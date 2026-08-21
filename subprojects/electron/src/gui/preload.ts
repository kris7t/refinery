/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import type RefineryContextBridge from '@tools.refinery/frontend/RefineryContextBridge';
import type {
  FileResult,
  OpenFileResult,
  ReadFileResult,
  ServerStateChangeCallback,
  ThemeSource,
  ThemeSourceChangeCallback,
} from '@tools.refinery/frontend/RefineryContextBridge';
import type BackendConfig from '@tools.refinery/frontend/xtext/BackendConfig';
import { contextBridge, ipcRenderer } from 'electron';

import { loggerContextBridge, getLogger } from '../logger/preloadLogger';

const logger = getLogger('gui.preload');

const serverStateCallbacks: ServerStateChangeCallback[] = [];

const themeSourceCallbacks: ThemeSourceChangeCallback[] = [];

const openDialogs = new Set<string>();

ipcRenderer.on(
  'refinery:serverStateChanged',
  (_event, serverState: boolean) => {
    for (const callback of serverStateCallbacks) {
      callback(serverState);
    }
  },
);

ipcRenderer.on(
  'refinery:themeSourceChanged',
  (_event, themeSource: ThemeSource) => {
    for (const callback of themeSourceCallbacks) {
      callback(themeSource);
    }
  },
);

function updateDialogCount() {
  ipcRenderer.send('refinery:setModalDialogCount', openDialogs.size);
}

contextBridge.exposeInMainWorld('refinery', {
  ...loggerContextBridge,
  async getBackendConfig() {
    return ipcRenderer.invoke(
      'refinery:getBackendConfig',
    ) as Promise<BackendConfig>;
  },
  onServerStateChange(callback) {
    if (typeof callback !== 'function') {
      return;
    }
    serverStateCallbacks.push(callback);
    (ipcRenderer.invoke('refinery:getServerState') as Promise<boolean>)
      .then(callback)
      .catch((error) =>
        logger.error({ err: error }, 'Failed to get server state'),
      );
  },
  setThemeSource(themeSource) {
    logger.info({ themeSource }, 'Setting theme source');
    ipcRenderer.send('refinery:setThemeSource', themeSource);
  },
  onThemeSourceChange(callback) {
    if (typeof callback !== 'function') {
      return;
    }
    themeSourceCallbacks.push(callback);
    (ipcRenderer.invoke('refinery:getThemeSource') as Promise<ThemeSource>)
      .then(callback)
      .catch((error) =>
        logger.error({ err: error }, 'Failed to get theme source'),
      );
  },
  async readFile() {
    return ipcRenderer.invoke('refinery:readFile') as Promise<
      ReadFileResult | undefined
    >;
  },
  async openFile() {
    return ipcRenderer.invoke('refinery:openFile') as Promise<
      OpenFileResult | undefined
    >;
  },
  async saveFile(text) {
    return ipcRenderer.invoke('refinery:saveFile', text) as Promise<
      FileResult | undefined
    >;
  },
  async saveFileAs(text) {
    return ipcRenderer.invoke('refinery:saveFileAs', text) as Promise<
      FileResult | undefined
    >;
  },
  openDialog(id) {
    logger.info({ dialogID: id }, 'Opening dialog');
    if (openDialogs.has(id)) {
      logger.error({ dialogID: id }, 'Duplicate dialog');
    } else {
      openDialogs.add(id);
      updateDialogCount();
    }
  },
  closeDialog(id) {
    logger.info({ dialogID: id }, 'Closing dialog');
    if (openDialogs.delete(id)) {
      updateDialogCount();
    } else {
      logger.error({ dialogID: id }, 'Unknown dialog');
    }
  },
} satisfies RefineryContextBridge);

// Clear the previous dialog count on page reload.
updateDialogCount();
