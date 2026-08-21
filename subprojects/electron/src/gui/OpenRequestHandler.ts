/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import type { BrowserWindow } from 'electron';

interface OpenRequest {
  filePath: string | undefined;
  replacesDefaultWindow: boolean;
}

export default class OpenRequestHandler {
  private readonly pendingRequests: OpenRequest[] = [];

  private openImmediately:
    ((filePath: string | undefined) => BrowserWindow) | undefined;

  /**
   * Opens an additional window without replacing the default startup window.
   * This ensures the first instance still gets a window if another instance
   * sends a request while it is starting.
   */
  open(filePath?: string): BrowserWindow | undefined {
    if (this.openImmediately === undefined) {
      this.pendingRequests.push({
        filePath,
        replacesDefaultWindow: false,
      });
      return undefined;
    }
    return this.openImmediately(filePath);
  }

  /**
   * Opens a file supplied during initial startup. Such a file takes the place
   * of the default untitled window instead of creating an unnecessary extra.
   */
  openInitial(filePath: string): BrowserWindow | undefined {
    if (this.openImmediately === undefined) {
      this.pendingRequests.push({ filePath, replacesDefaultWindow: true });
      return undefined;
    }
    return this.openImmediately(filePath);
  }

  initialize(
    openImmediately: (filePath: string | undefined) => BrowserWindow,
  ): [BrowserWindow, ...BrowserWindow[]] {
    if (this.openImmediately !== undefined) {
      throw new Error('OpenRequestHandler is already initialized');
    }
    this.openImmediately = openImmediately;
    if (
      !this.pendingRequests.some(
        ({ replacesDefaultWindow }) => replacesDefaultWindow,
      )
    ) {
      this.pendingRequests.unshift({
        filePath: undefined,
        replacesDefaultWindow: true,
      });
    }
    const results = this.pendingRequests.map(({ filePath }) =>
      openImmediately(filePath),
    );
    this.pendingRequests.length = 0;
    return results as [BrowserWindow, ...BrowserWindow[]];
  }
}
