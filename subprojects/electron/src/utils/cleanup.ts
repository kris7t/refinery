/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { app } from 'electron';

import getLogger from "./getLogger";

const logger = getLogger('utils.cleanup');

const cleanupFunctions: (() => void)[] = [];

export default function cleanup(): void {
  for (const cleanupFunction of cleanupFunctions) {
    try {
      cleanupFunction();
    } catch (error) {
      logger.error({ err: error }, 'Error while cleaning up');
    }
  }
}

app.on('will-quit', () => {
  cleanup();
});

export function onCleanup(callback: () => void): void {
  cleanupFunctions.push(callback);
}
