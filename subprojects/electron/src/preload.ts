/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import type RefineryContextBridge from '@tools.refinery/frontend/RefineryContextBridge';
import type { ServerStateChangeCallback, ThemeSource, ThemeSourceChangeCallback } from '@tools.refinery/frontend/RefineryContextBridge';
import type BackendConfig from '@tools.refinery/frontend/xtext/BackendConfig';
import { contextBridge, ipcRenderer } from 'electron';

const serverStateCallbacks: ServerStateChangeCallback[] = [];

const themeSourceCallbacks: ThemeSourceChangeCallback[] = [];

ipcRenderer.on('refinery:serverStateChanged', (_event, serverState: boolean) => {
  for (const callback of serverStateCallbacks) {
    callback(serverState);
  }
});

ipcRenderer.on('refinery:themeSourceChanged', (_event, themeSource: ThemeSource) => {
  for (const callback of themeSourceCallbacks) {
    callback(themeSource);
  }
});

contextBridge.exposeInMainWorld('refinery', {
  async getBackendConfig() {
    return ipcRenderer.invoke('refinery:getBackendConfig') as Promise<BackendConfig>;
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
  }
} satisfies RefineryContextBridge);
