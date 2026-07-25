/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { utimes } from 'node:fs/promises';

export const EPOCH = new Date(2020, 0, 1, 0, 0, 0, 0);

/**
 * Fixes the modification time of a file to a known value that survives zip round-tripping.
 *
 * @param {string} path The path to fix.
 * @returns {Promise<void>}
 */
export default function fixMtimes(path) {
  return utimes(path, EPOCH, EPOCH);
}
