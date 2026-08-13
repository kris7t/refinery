/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { getArchSuffix, resolvePackagedPath } from './packagedPaths';

/**
 * Path to the `electron-builder` unpacked main GUI executable (as opposed to
 * the `bin/refinery` CLI shim), relative to the subproject root.
 */
function getRelativeElectronPath(): string {
  const archSuffix = getArchSuffix();
  switch (process.platform) {
    case 'linux':
      return `build/dist/linux${archSuffix}-unpacked/refinery`;
    case 'darwin':
      return `build/dist/mac${archSuffix}/Refinery.app/Contents/MacOS/Refinery`;
    case 'win32':
      return `build/dist/win${archSuffix}-unpacked/Refinery.exe`;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

export default function getPackagedElectronPath(): string {
  return resolvePackagedPath(
    getRelativeElectronPath(),
    'Packaged Electron binary',
  );
}
