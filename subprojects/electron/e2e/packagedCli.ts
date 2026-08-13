/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');

// `electron-builder` only omits the arch suffix from the unpacked directory
// name when building for its default arch, which is `x64` unless a
// `<platform>.defaultArch` is configured (it isn't here, for any platform).
function getArchSuffix(): string {
  return process.arch === 'x64' ? '' : `-${process.arch}`;
}

/**
 * Path to the `electron-builder` unpacked CLI shim, relative to the subproject root.
 */
function getRelativeCliPath(): string {
  const archSuffix = getArchSuffix();
  switch (process.platform) {
    case 'linux':
      return `build/dist/linux${archSuffix}-unpacked/bin/refinery`;
    case 'darwin':
      return `build/dist/mac${archSuffix}/Refinery.app/Contents/Resources/bin/refinery`;
    case 'win32':
      return `build/dist/win${archSuffix}-unpacked/bin/refinery.exe`;
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
