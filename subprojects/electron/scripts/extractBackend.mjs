/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { rm, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { extract } from 'tar';

import version from './version.mjs';

const targetDir = path.join(import.meta.dirname, '../build/backend');

const distTar = path.join(
  import.meta.dirname,
  `../../language-web/build/distributions/refinery-language-web-${version}.tar`,
);

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });
await extract({
  file: distTar,
  strip: 1,
  cwd: targetDir,
});
