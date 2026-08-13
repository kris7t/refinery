/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

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
import loadPDF from './loadPDF';
import normalizeSvg from './normalizeSvg';
import getPackagedCliPath from './packagedCli';
import pdfHasEmbeddedFont, {
  pdfDocumentHasEmbeddedFont,
} from './pdfHasEmbeddedFont';
import { renderPDFDocumentToPNG } from './renderPDFToPNG';
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
      await expectPNGSnapshot(
        contents,
        path.join(snapshotsDir, `${snapshotName}.png`),
      );
    },
  );
});

// pdf.js always rasterizes onto an opaque canvas, so only the
// solid-background cases have a matching PNG snapshot.
const pdfCases = [
  {
    snapshotName: 'theme-light-solid',
    args: ['-theme', 'light', '-transparent', 'false'],
  },
  {
    snapshotName: 'theme-dark-solid',
    args: ['-theme', 'dark', '-transparent', 'false'],
  },
];

describe.skipIf(isUpdatingSnapshots())('pdf render options', () => {
  test.each(pdfCases)(
    'renders with $snapshotName',
    async ({ snapshotName, args }) => {
      const outputPath = path.join(tempDir, 'out.pdf');
      const result = await runCli(cliPath, [
        'render',
        inputPath,
        '-output',
        outputPath,
        '-embed-fonts',
        'true',
        ...args,
      ]);
      expect(result.exitCode).toBe(0);
      const referencePng = await readFile(
        path.join(snapshotsDir, `${snapshotName}.png`),
      );
      const pdf = await readFile(outputPath);
      const document = await loadPDF(pdf);
      let rasterized;
      try {
        expect(await pdfDocumentHasEmbeddedFont(document)).toBe(true);
        const { width } = PNG.sync.read(referencePng);
        rasterized = await renderPDFDocumentToPNG(document, width);
      } finally {
        await document.destroy();
      }
      comparePNG(rasterized, referencePng, {
        label: `${snapshotName} (pdf vs png)`,
        maxSizeDiff: 1,
        maxDiffRatio: 0.03,
      });
    },
  );

  // Rendering without embedded fonts to a canvas would need to load system
  // fonts by hand, and wouldn't tell us anything more than this already
  // does, so we only check that no font got embedded here.
  test.each(['light', 'dark'])(
    'does not embed fonts with -theme %s -embed-fonts false',
    async (theme) => {
      const outputPath = path.join(tempDir, 'out.pdf');
      const result = await runCli(cliPath, [
        'render',
        inputPath,
        '-output',
        outputPath,
        '-theme',
        theme,
        '-embed-fonts',
        'false',
      ]);
      expect(result.exitCode).toBe(0);
      const pdf = await readFile(outputPath);
      expect(await pdfHasEmbeddedFont(pdf)).toBe(false);
    },
  );
});
