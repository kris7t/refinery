/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import rawVersion from './scripts/version.mjs';

/** @type {unknown} */
const packageJSON = JSON.parse(
  await readFile(path.join(import.meta.dirname, 'app/package.json'), 'utf-8'),
);
if (
  typeof packageJSON !== 'object' ||
  packageJSON === null ||
  !('version' in packageJSON)
) {
  throw new Error('Missing "version" field in app/package.json');
} else if (
  typeof packageJSON.version !== 'string' ||
  packageJSON.version !== rawVersion.toLowerCase()
) {
  throw new Error(
    `Version in app/package.json ${JSON.stringify(packageJSON.version)} ` +
      `does not match gradle.properties ${JSON.stringify(rawVersion)}`,
  );
}

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'tools.refinery.Refinery',
  productName: 'Refinery',
  directories: {
    app: 'app',
    output: 'build/dist',
  },
  linux: {
    target: ['AppImage'],
    category: 'Development',
  },
  win: {
    target: ['nsis'],
  },
  mac: {
    target: ['dmg'],
    category: 'public.app-category.developer-tools',
    darkModeSupport: true,
  },
  npmRebuild: false,
  files: [
    'package.json',
    {
      from: '../build/esbuild/production',
      to: '.',
      filter: '**/*',
    },
    {
      from: '../../frontend/build/vite/production',
      to: 'frontend',
      filter: ['**/*', '!**/*.br', '!**/*.gz'],
    },
  ],
  extraResources: [
    {
      from: 'build/backend',
      to: 'lib',
      filter: '**/*',
    },
    {
      from: 'build/jre',
      to: 'jre',
      filter: '**/*',
    },
  ],
};

export default config;
