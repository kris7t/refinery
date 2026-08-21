/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import type { BrowserWindow } from 'electron';
import { makeAutoObservable } from 'mobx';

export default class WindowStore {
  private readonly reactionDisposers = new Set<() => void>();

  private disposed = false;

  modalDialogCount = 0;

  filePath: string | undefined;

  constructor() {
    makeAutoObservable<WindowStore, 'disposed' | 'reactionDisposers'>(this, {
      disposed: false,
      reactionDisposers: false,
      addReactionDisposer: false,
      dispose: false,
    });
  }

  setModalDialogCount(modalDialogCount: number): void {
    this.modalDialogCount = modalDialogCount;
  }

  setFilePath(filePath: string | undefined): void {
    this.filePath = filePath;
  }

  addReactionDisposer(disposer: () => void): void {
    if (this.disposed) {
      disposer();
      return;
    }
    this.reactionDisposers.add(disposer);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const disposer of this.reactionDisposers) {
      disposer();
    }
    this.reactionDisposers.clear();
  }
}

const windowStores = new Map<BrowserWindow, WindowStore>();

export function createWindowStore(browserWindow: BrowserWindow): WindowStore {
  if (windowStores.has(browserWindow)) {
    throw new Error('WindowStore already exists for BrowserWindow');
  }
  const windowStore = new WindowStore();
  windowStores.set(browserWindow, windowStore);
  browserWindow.once('closed', () => {
    if (windowStores.get(browserWindow) === windowStore) {
      windowStores.delete(browserWindow);
      windowStore.dispose();
    }
  });
  return windowStore;
}

export function getWindowStore(browserWindow: BrowserWindow): WindowStore {
  const windowStore = windowStores.get(browserWindow);
  if (windowStore === undefined) {
    throw new Error('No WindowStore found for BrowserWindow');
  }
  return windowStore;
}

export function findWindowByFilePath(
  filePath: string,
): BrowserWindow | undefined {
  for (const [browserWindow, windowStore] of windowStores) {
    if (windowStore.filePath === filePath) {
      return browserWindow;
    }
  }
  return undefined;
}
