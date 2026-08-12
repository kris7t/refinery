/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['e2e/**/*.test.ts'],
    // Real JVM and Electron cold starts are much slower than the mocked unit suite.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
