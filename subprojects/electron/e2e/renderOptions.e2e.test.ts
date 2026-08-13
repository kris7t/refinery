/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';

import expectPngSnapshot from './expectPngSnapshot';
import normalizeSvg from './normalizeSvg';
import getPackagedCliPath from './packagedCli';
import runCli from './runCli';

const inputPath = path.join(import.meta.dirname, 'fixtures', 'theme.problem');
const snapshotsDir = path.join(import.meta.dirname, '__snapshots__');

let cliPath: string;

beforeAll(() => {
  cliPath = getPackagedCliPath();
});

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'refinery-e2e-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

const svgCases = [
  { snapshotName: 'theme-light', args: ['-theme', 'light'] },
  { snapshotName: 'theme-dark', args: ['-theme', 'dark'] },
  { snapshotName: 'theme-auto', args: ['-theme', 'auto'] },
  {
    snapshotName: 'theme-light-solid',
    args: ['-theme', 'light', '-transparent', 'false'],
  },
  {
    snapshotName: 'theme-dark-solid',
    args: ['-theme', 'dark', '-transparent', 'false'],
  },
  {
    snapshotName: 'theme-light-embed-fonts',
    args: ['-theme', 'light', '-embed-fonts', 'true'],
  },
  {
    snapshotName: 'theme-dark-embed-fonts',
    args: ['-theme', 'dark', '-embed-fonts', 'true'],
  },
];

describe('svg render options', () => {
  test.each(svgCases)(
    'renders with $snapshotName',
    async ({ snapshotName, args }) => {
      const outputPath = path.join(tempDir, 'out.svg');
      const result = await runCli(cliPath, [
        'render',
        inputPath,
        '-output',
        outputPath,
        ...args,
      ]);
      expect(result.exitCode).toBe(0);
      const contents = await readFile(outputPath, 'utf-8');
      await expect(normalizeSvg(contents)).toMatchFileSnapshot(
        path.join(snapshotsDir, `${snapshotName}.svg`),
      );
    },
  );
});

const pngCases = [
  { snapshotName: 'theme-light', args: ['-theme', 'light'] },
  { snapshotName: 'theme-dark', args: ['-theme', 'dark'] },
  {
    snapshotName: 'theme-light-solid',
    args: ['-theme', 'light', '-transparent', 'false'],
  },
  {
    snapshotName: 'theme-dark-solid',
    args: ['-theme', 'dark', '-transparent', 'false'],
  },
  { snapshotName: 'theme-light-2x', args: ['-theme', 'light', '-scale', '2'] },
];

describe('png render options', () => {
  test.each(pngCases)(
    'renders with $snapshotName',
    async ({ snapshotName, args }) => {
      const outputPath = path.join(tempDir, 'out.png');
      const result = await runCli(cliPath, [
        'render',
        inputPath,
        '-output',
        outputPath,
        ...args,
      ]);
      expect(result.exitCode).toBe(0);
      const contents = await readFile(outputPath);
      await expectPngSnapshot(
        contents,
        path.join(snapshotsDir, `${snapshotName}.png`),
      );
    },
  );
});
