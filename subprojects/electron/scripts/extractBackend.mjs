/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { rm, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { extract } from 'tar';

import version from './version.mjs';
import writeManifestJar from './writeManifestJar.mjs';

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
 * @returns {Promise<Set<string>>}
 */
async function extractDistTar(name) {
  const distTar = path.join(
    import.meta.dirname,
    `../../${name}/build/distributions/refinery-${name}-${version}.tar`,
  );
  /** @type {string[]} */
  const libs = [];
  await extract({
    file: distTar,
    'keep-existing': true,
    strip: 2,
    cwd: targetDir,
    filter(filePath) {
      const dirName = path.basename(path.dirname(filePath));
      const fileName = path.basename(filePath);
      const matches = dirName === 'lib' && !otherTargetsRegExp.test(fileName);
      if (matches && /\.jar$/i.test(fileName)) {
        libs.push(fileName);
      }
      return matches;
    },
  });
  return new Set(libs);
}

/**
 * @param {string} name
 * @param {Iterable<string>} entries
 * @returns {Promise<void>}
 */
function writePathingJar(name, entries) {
  return writeManifestJar(path.join(targetDir, `${name}.jar`), entries, {
    'Bundle-SymbolicName': `tools.refinery.${name}`,
    'Bundle-Version': version,
  });
}

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

const webLibs = await extractDistTar('language-web');
const cliLibs = await extractDistTar('generator-cli');
const commonLibs = webLibs.intersection(cliLibs);
const webOnlyLibs = webLibs.difference(commonLibs);
const cliOnlyLibs = cliLibs.difference(commonLibs);

await Promise.all([
  writePathingJar('refinery-common-all', commonLibs),
  writePathingJar('refinery-language-web-all', webOnlyLibs),
  writePathingJar('refinery-generator-cli-all', cliOnlyLibs),
]);
