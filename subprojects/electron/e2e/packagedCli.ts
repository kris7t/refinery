/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');

/**
 * Path to the `electron-builder` unpacked CLI shim, relative to the subproject root.
 */
function getRelativeCliPath(): string {
  switch (process.platform) {
    case 'linux':
      return 'build/dist/linux-unpacked/bin/refinery';
    case 'darwin':
      return 'build/dist/mac/Refinery.app/Contents/Resources/bin/refinery';
    case 'win32':
      return 'build/dist/win-unpacked/bin/refinery.exe';
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

export default function getPackagedCliPath(): string {
  const cliPath = path.join(root, getRelativeCliPath());
  if (!existsSync(cliPath)) {
    throw new Error(
      `Packaged CLI not found at ${cliPath}. Run \`yarn run build\` first.`,
    );
  }
  return cliPath;
}
