/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { isUtf8 } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  FileResultOrError,
  OpenFileResult,
  ReadFileResult,
} from '@tools.refinery/frontend/RefineryContextBridge';
import {
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
} from 'electron';
import z from 'zod/v4';

import getLogger from '../logger/getLogger';

import { openWindowsStore } from './OpenWindowsStore';

const logger = getLogger('gui.fileIO');

const FileText = z.string();

class FileOperationError extends Error {
  constructor(
    readonly filePath: string,
    cause: unknown,
  ) {
    super('File operation failed', { cause });
  }
}

class InvalidUTF8Error extends FileOperationError {}

async function readUTF8File(filePath: string): Promise<string> {
  const contents = await readFile(filePath);
  if (!isUtf8(contents)) {
    throw new InvalidUTF8Error(filePath, new Error('Invalid UTF-8'));
  }
  return contents.toString('utf-8');
}

function getFileErrorResult(error: unknown, browserWindow?: BrowserWindow) {
  let filePath: string | undefined;
  if (error instanceof FileOperationError) {
    filePath = error.filePath;
  } else if (browserWindow !== undefined) {
    try {
      filePath = openWindowsStore.getWindowStore(browserWindow).filePath;
    } catch {
      // The original error is more useful and has already been logged.
    }
  }
  return {
    error: true as const,
    ...(filePath === undefined ? {} : { name: path.basename(filePath) }),
    ...(error instanceof InvalidUTF8Error
      ? { reason: 'invalidUtf8' as const }
      : {}),
  };
}

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

export function focusWindowForFile(
  filePath: string,
  excludedWindow?: BrowserWindow,
): BrowserWindow | undefined {
  const existingWindow = openWindowsStore.findWindowByFilePath(filePath);
  if (existingWindow === undefined || existingWindow === excludedWindow) {
    return undefined;
  }
  if (existingWindow.isMinimized()) {
    existingWindow.restore();
  }
  existingWindow.focus();
  return existingWindow;
}

async function readWindowFile(
  browserWindow: BrowserWindow,
): Promise<ReadFileResult> {
  const { filePath, hash } = openWindowsStore.getWindowStore(browserWindow);
  if (hash !== undefined) {
    return { hash };
  }
  if (filePath === undefined) {
    return undefined;
  }
  let text: string;
  try {
    text = await readUTF8File(filePath);
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      // Create a new file by specifying a nonexistent path on the command line.
      text = '';
    } else {
      throw error;
    }
  }
  return {
    name: path.basename(filePath),
    text,
  };
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
  if (focusWindowForFile(resolvedPath, browserWindow) !== undefined) {
    return undefined;
  }
  let text: string;
  try {
    text = await readUTF8File(resolvedPath);
  } catch (error) {
    if (error instanceof FileOperationError) {
      throw error;
    }
    throw new FileOperationError(resolvedPath, error);
  }
  openWindowsStore.getWindowStore(browserWindow).setFilePath(resolvedPath);
  return {
    name: path.basename(resolvedPath),
    text,
  };
}

async function saveFileAs(
  browserWindow: BrowserWindow,
  text: string,
): Promise<FileResultOrError> {
  const windowStore = openWindowsStore.getWindowStore(browserWindow);
  const result = await dialog.showSaveDialog(browserWindow, {
    defaultPath: windowStore.filePath ?? 'graph.problem',
    filters,
  });
  if (result.canceled || result.filePath === undefined) {
    return undefined;
  }
  const resolvedPath = path.resolve(result.filePath);
  const existingWindow = openWindowsStore.findWindowByFilePath(resolvedPath);
  if (existingWindow !== undefined && existingWindow !== browserWindow) {
    return {
      error: true,
      name: path.basename(resolvedPath),
      reason: 'alreadyOpen',
    };
  }
  try {
    await writeFile(resolvedPath, text, 'utf-8');
  } catch (error) {
    throw new FileOperationError(resolvedPath, error);
  }
  windowStore.setFilePath(resolvedPath);
  return {
    name: path.basename(resolvedPath),
  };
}

async function saveFile(
  browserWindow: BrowserWindow,
  text: string,
): Promise<FileResultOrError> {
  const { filePath } = openWindowsStore.getWindowStore(browserWindow);
  if (filePath === undefined) {
    return saveFileAs(browserWindow, text);
  }
  await writeFile(filePath, text, 'utf-8');
  return {
    name: path.basename(filePath),
  };
}

export default function attachFileIOHandlers(): void {
  ipcMain.handle('refinery:readFile', async (event) => {
    let browserWindow: BrowserWindow | undefined;
    try {
      browserWindow = getBrowserWindow(event);
      return await readWindowFile(browserWindow);
    } catch (error) {
      logger.error({ err: error }, 'Failed to read file');
      return getFileErrorResult(error, browserWindow);
    }
  });
  ipcMain.handle('refinery:openFile', async (event) => {
    let browserWindow: BrowserWindow | undefined;
    try {
      browserWindow = getBrowserWindow(event);
      return await openFile(browserWindow);
    } catch (error) {
      logger.error({ err: error }, 'Failed to open file');
      return getFileErrorResult(error, browserWindow);
    }
  });
  ipcMain.handle('refinery:clearFile', (event) => {
    try {
      openWindowsStore
        .getWindowStore(getBrowserWindow(event))
        .setFilePath(undefined);
    } catch (error) {
      logger.error({ err: error }, 'Failed to clear open file');
      return { error: true };
    }
    return undefined;
  });
  ipcMain.handle('refinery:saveFile', async (event, rawText: unknown) => {
    let browserWindow: BrowserWindow | undefined;
    try {
      browserWindow = getBrowserWindow(event);
      return await saveFile(browserWindow, FileText.parse(rawText));
    } catch (error) {
      logger.error({ err: error }, 'Failed to save file');
      return getFileErrorResult(error, browserWindow);
    }
  });
  ipcMain.handle('refinery:saveFileAs', async (event, rawText: unknown) => {
    let browserWindow: BrowserWindow | undefined;
    try {
      browserWindow = getBrowserWindow(event);
      return await saveFileAs(browserWindow, FileText.parse(rawText));
    } catch (error) {
      logger.error({ err: error }, 'Failed to save file as');
      return getFileErrorResult(error, browserWindow);
    }
  });
}
