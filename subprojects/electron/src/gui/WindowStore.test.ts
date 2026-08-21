/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { EventEmitter } from 'node:events';

import type { BrowserWindow } from 'electron';
import { isObservableProp } from 'mobx';
import { describe, expect, test, vi } from 'vitest';

import {
  createWindowStore,
  findWindowByFilePath,
  getWindowStore,
} from './WindowStore';

function createBrowserWindow(): BrowserWindow {
  return new EventEmitter() as BrowserWindow;
}

describe('WindowStore registry', () => {
  test('creates an observable store for a BrowserWindow', () => {
    const browserWindow = createBrowserWindow();
    const windowStore = createWindowStore(browserWindow);

    expect(getWindowStore(browserWindow)).toBe(windowStore);
    expect(isObservableProp(windowStore, 'modalDialogCount')).toBe(true);
    expect(isObservableProp(windowStore, 'filePath')).toBe(true);
    expect(isObservableProp(windowStore, 'hash')).toBe(true);
    expect(windowStore.filePath).toBeUndefined();
    expect(windowStore.hash).toBeUndefined();

    windowStore.setModalDialogCount(2);
    expect(windowStore.modalDialogCount).toBe(2);
    windowStore.setFilePath('/example/model.problem');
    expect(windowStore.filePath).toBe('/example/model.problem');
    windowStore.setHash('#/2/shared-model');
    expect(windowStore.filePath).toBeUndefined();
    expect(windowStore.hash).toBe('#/2/shared-model');
    windowStore.setFilePath('/example/saved.problem');
    expect(windowStore.filePath).toBe('/example/saved.problem');
    expect(windowStore.hash).toBeUndefined();

    browserWindow.emit('closed');
  });

  test('rejects duplicate stores', () => {
    const browserWindow = createBrowserWindow();
    createWindowStore(browserWindow);

    expect(() => createWindowStore(browserWindow)).toThrow(
      'WindowStore already exists for BrowserWindow',
    );

    browserWindow.emit('closed');
  });

  test('rejects unregistered windows', () => {
    const browserWindow = createBrowserWindow();

    expect(() => getWindowStore(browserWindow)).toThrow(
      'No WindowStore found for BrowserWindow',
    );
  });

  test('finds the window associated with a file path', () => {
    const browserWindow = createBrowserWindow();
    const windowStore = createWindowStore(browserWindow);
    const filePath = '/example/model.problem';
    windowStore.setFilePath(filePath);

    expect(findWindowByFilePath(filePath)).toBe(browserWindow);
    expect(findWindowByFilePath('/example/other.problem')).toBeUndefined();

    browserWindow.emit('closed');
    expect(findWindowByFilePath(filePath)).toBeUndefined();
  });

  test('removes and disposes the store when the window is closed', () => {
    const browserWindow = createBrowserWindow();
    const windowStore = createWindowStore(browserWindow);
    const disposer = vi.fn();
    windowStore.addReactionDisposer(disposer);

    browserWindow.emit('closed');

    expect(disposer).toHaveBeenCalledOnce();
    expect(() => getWindowStore(browserWindow)).toThrow(
      'No WindowStore found for BrowserWindow',
    );

    windowStore.dispose();
    expect(disposer).toHaveBeenCalledOnce();
  });
});
