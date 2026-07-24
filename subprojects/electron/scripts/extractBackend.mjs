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

const platforms = /** @type {const} */ (['darwin', 'linux', 'win32']);
const arches = /** @type {const} */ (['aarch64', 'x86-64']);
/** @type {`${platforms[number]}-${arches[number]}`[]} */
const targets = [];
for (const platform of platforms) {
  for (const arch of arches) {
    targets.push(`${platform}-${arch}`);
  }
}

/** @type {platforms[number]} */
let currentPlatform;
switch (process.platform) {
  case 'darwin':
  case 'linux':
  case 'win32':
    currentPlatform = process.platform;
    break;
  default:
    throw new Error(`Unsupported platform: ${process.platform}`);
}
/** @type {arches[number]} */
let currentArch;
switch (process.arch) {
  case 'arm64':
    currentArch = 'aarch64';
    break;
  case 'x64':
    currentArch = 'x86-64';
    break;
  default:
    throw new Error(`Unsupported architecture: ${process.arch}`);
}
/** @type {targets[number]} */
const currentTarget = `${currentPlatform}-${currentArch}`;

const otherTargets = targets.filter((target) => target !== currentTarget);
const otherTargetsRegExp = new RegExp(
  otherTargets.map((target) => RegExp.escape(target)).join('|'),
);

/**
 * Extract jars from a Gradle distribution tar.
 *
 * @param {string} name
 * @returns {Promise<void>}
 */
async function extractDistTar(name) {
  const distTar = path.join(
    import.meta.dirname,
    `../../${name}/build/distributions/refinery-${name}-${version}.tar`,
  );
  await extract({
    file: distTar,
    strip: 2,
    cwd: targetDir,
    filter(filePath) {
      const dirName = path.basename(path.dirname(filePath));
      const fileName = path.basename(filePath);
      return (
        dirName === 'lib' && !otherTargetsRegExp.test(fileName)
      );
    },
  });
}

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });
await extractDistTar('language-web');
