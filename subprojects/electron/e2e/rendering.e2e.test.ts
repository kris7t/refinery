/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { readdirSync } from 'node:fs';
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

import normalizeSvg from './normalizeSvg';
import getPackagedCliPath from './packagedCli';
import runCli from './runCli';

const renderingFixturesDir = path.join(
  import.meta.dirname,
  'fixtures',
  'rendering',
);
const renderingFixtures = readdirSync(renderingFixturesDir)
  .filter((name) => name.endsWith('.problem'))
  .toSorted();
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

describe('svg rendering', () => {
  test.each(renderingFixtures)('renders %s', async (fixtureName) => {
    const inputPath = path.join(renderingFixturesDir, fixtureName);
    const outputPath = path.join(tempDir, 'out.svg');
    const result = await runCli(cliPath, [
      'render',
      inputPath,
      '-output',
      outputPath,
      '-transparent',
      'false',
    ]);
    expect(result.exitCode).toBe(0);
    const contents = await readFile(outputPath, 'utf-8');
    const snapshotName = fixtureName.replace(/\.problem$/, '.svg');
    await expect(normalizeSvg(contents)).toMatchFileSnapshot(
      path.join(snapshotsDir, snapshotName),
    );
  });
});
