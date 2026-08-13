/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { readdirSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PNG } from 'pngjs';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';

import comparePNG from './comparePNG';
import expectPNGSnapshot from './expectPNGSnapshot';
import isUpdatingSnapshots from './isUpdatingSnapshots';
import normalizeSvg from './normalizeSvg';
import getPackagedCliPath from './packagedCli';
import renderPDFToPNG from './renderPDFToPNG';
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

describe('png rendering', () => {
  test.each(renderingFixtures)('renders %s', async (fixtureName) => {
    const inputPath = path.join(renderingFixturesDir, fixtureName);
    const outputPath = path.join(tempDir, 'out.png');
    const result = await runCli(cliPath, [
      'render',
      inputPath,
      '-output',
      outputPath,
      '-transparent',
      'false',
    ]);
    expect(result.exitCode).toBe(0);
    const contents = await readFile(outputPath);
    const snapshotName = fixtureName.replace(/\.problem$/, '.png');
    await expectPNGSnapshot(contents, path.join(snapshotsDir, snapshotName));
  });
});

describe.skipIf(isUpdatingSnapshots())('pdf rendering', () => {
  // Only the embedded-fonts case is covered: rendering without embedded
  // fonts to a canvas would need to load system fonts by hand, and
  // wouldn't tell us whether the font was actually omitted from the PDF
  // anyway (that's better checked by inspecting the PDF's own font
  // resources, not by rasterizing it).
  test.each(renderingFixtures)('renders %s', async (fixtureName) => {
    const inputPath = path.join(renderingFixturesDir, fixtureName);
    const outputPath = path.join(tempDir, 'out.pdf');
    const result = await runCli(cliPath, [
      'render',
      inputPath,
      '-output',
      outputPath,
      '-transparent',
      'false',
      '-embed-fonts',
      'true',
    ]);
    expect(result.exitCode).toBe(0);
    const pdf = await readFile(outputPath);
    const pngSnapshotName = fixtureName.replace(/\.problem$/, '.png');
    const referencePng = await readFile(
      path.join(snapshotsDir, pngSnapshotName),
    );
    const { width } = PNG.sync.read(referencePng);
    const rasterized = await renderPDFToPNG(pdf, width);
    // The independent PDF and PNG rendering pipelines round fractional page
    // dimensions slightly differently, and pdf.js's own rasterizer produces
    // different anti-aliasing than the PNG export's, so this is a looser,
    // approximate comparison rather than an exact pixel match.
    comparePNG(rasterized, referencePng, {
      label: `${fixtureName} (pdf vs png)`,
      maxSizeDiff: 1,
      maxDiffRatio: 0.03,
    });
  });
});
