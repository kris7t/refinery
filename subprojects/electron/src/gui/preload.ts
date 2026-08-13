/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import type RefineryContextBridge from '@tools.refinery/frontend/RefineryContextBridge';
import type {
  ServerStateChangeCallback,
  ThemeSource,
  ThemeSourceChangeCallback,
} from '@tools.refinery/frontend/RefineryContextBridge';
import type BackendConfig from '@tools.refinery/frontend/xtext/BackendConfig';
import { contextBridge, ipcRenderer } from 'electron';

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
      .catch((error) => console.log(error));
  },
  setThemeSource(themeSource) {
    ipcRenderer.send('refinery:setThemeSource', themeSource);
  },
  onThemeSourceChange(callback) {
    if (typeof callback !== 'function') {
      return;
    }
    themeSourceCallbacks.push(callback);
    (ipcRenderer.invoke('refinery:getThemeSource') as Promise<ThemeSource>)
      .then(callback)
      .catch((error) => console.log(error));
  },
  openDialog(id) {
    if (openDialogs.has(id)) {
      console.error('Duplicate dialog', id);
    } else {
      openDialogs.add(id);
      updateDialogCount();
    }
  },
  closeDialog(id) {
    if (openDialogs.delete(id)) {
      updateDialogCount();
    } else {
      console.error('Unknown dialog', id);
    }
  },
} satisfies RefineryContextBridge);

// Clear the previous dialog count on page reload.
updateDialogCount();
