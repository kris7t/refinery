/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  FileResult,
  OpenFileResult,
} from '@tools.refinery/frontend/RefineryContextBridge';
import {
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
} from 'electron';
import z from 'zod/v4';

import getLogger from '../logger/getLogger';

import { findWindowByFilePath, getWindowStore } from './WindowStore';

const logger = getLogger('gui.fileIO');

const FileText = z.string();

const filters = [
  {
    name: 'Refinery files',
    extensions: ['problem', 'refinery'],
  },
];

function getBrowserWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  if (browserWindow === null) {
    throw new Error('File operation requested without a BrowserWindow');
  }
  return browserWindow;
}

function bringToFront(existingWindow: BrowserWindow) {
  if (existingWindow.isMinimized()) {
    existingWindow.restore();
  }
  existingWindow.focus();
}

async function openFile(
  browserWindow: BrowserWindow,
): Promise<OpenFileResult | undefined> {
  const result = await dialog.showOpenDialog(browserWindow, {
    properties: ['openFile'],
    filters,
  });
  const filePath = result.filePaths[0];
  if (result.canceled || filePath === undefined) {
    return undefined;
  }
  const resolvedPath = path.resolve(filePath);
  const existingWindow = findWindowByFilePath(resolvedPath);
  if (existingWindow !== undefined && existingWindow !== browserWindow) {
    bringToFront(existingWindow);
    return undefined;
  }
  const text = await readFile(resolvedPath, 'utf-8');
  getWindowStore(browserWindow).setFilePath(resolvedPath);
  return {
    name: path.basename(resolvedPath),
    text,
  };
}

async function saveFileAs(
  browserWindow: BrowserWindow,
  text: string,
): Promise<FileResult | undefined> {
  const windowStore = getWindowStore(browserWindow);
  const result = await dialog.showSaveDialog(browserWindow, {
    defaultPath: windowStore.filePath ?? 'graph.problem',
    filters,
  });
  if (result.canceled || result.filePath === undefined) {
    return undefined;
  }
  const resolvedPath = path.resolve(result.filePath);
  const existingWindow = findWindowByFilePath(resolvedPath);
  if (existingWindow !== undefined && existingWindow !== browserWindow) {
    bringToFront(existingWindow);
    return undefined;
  }
  await writeFile(resolvedPath, text, 'utf-8');
  windowStore.setFilePath(resolvedPath);
  return {
    name: path.basename(resolvedPath),
  };
}

async function saveFile(
  browserWindow: BrowserWindow,
  text: string,
): Promise<FileResult | undefined> {
  const { filePath } = getWindowStore(browserWindow);
  if (filePath === undefined) {
    return saveFileAs(browserWindow, text);
  }
  await writeFile(filePath, text, 'utf-8');
  return {
    name: path.basename(filePath),
  };
}

export default function attachFileIOHandlers(): void {
  ipcMain.handle('refinery:openFile', async (event) => {
    try {
      return await openFile(getBrowserWindow(event));
    } catch (error) {
      logger.error({ err: error }, 'Failed to open file');
      return undefined;
    }
  });
  ipcMain.handle('refinery:saveFile', async (event, rawText: unknown) => {
    try {
      return await saveFile(getBrowserWindow(event), FileText.parse(rawText));
    } catch (error) {
      logger.error({ err: error }, 'Failed to save file');
      return undefined;
    }
  });
  ipcMain.handle('refinery:saveFileAs', async (event, rawText: unknown) => {
    try {
      return await saveFileAs(getBrowserWindow(event), FileText.parse(rawText));
    } catch (error) {
      logger.error({ err: error }, 'Failed to save file as');
      return undefined;
    }
  });
}
