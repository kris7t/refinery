/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { expect } from 'vitest';

export interface PngSnapshotOptions {
  /** Fraction of pixels (0 to 1) allowed to differ before the snapshot fails. */
  maxDiffRatio?: number;
}

/**
 * Approximately compares `actual` against a PNG reference snapshot stored at
 * `snapshotPath`, since headless rendering isn't guaranteed to be
 * byte-identical across platforms. Missing snapshots are created
 * automatically, like `toMatchFileSnapshot`.
 */
export default async function expectPngSnapshot(
  actual: Buffer,
  snapshotPath: string,
  { maxDiffRatio = 0.01 }: PngSnapshotOptions = {},
): Promise<void> {
  const updateSnapshots = process.env['REFINERY_UPDATE_SNAPSHOTS'] === '1';
  let expected: Buffer | undefined;
  try {
    expected = await readFile(snapshotPath);
  } catch {
    expected = undefined;
  }

  if (updateSnapshots || expected === undefined) {
    await mkdir(path.dirname(snapshotPath), { recursive: true });
    await writeFile(snapshotPath, actual);
    return;
  }

  const actualPng = PNG.sync.read(actual);
  const expectedPng = PNG.sync.read(expected);
  expect(
    { width: actualPng.width, height: actualPng.height },
    `${snapshotPath} has an unexpected size`,
  ).toEqual({ width: expectedPng.width, height: expectedPng.height });

  const { width, height } = actualPng;
  const diffPixels = pixelmatch(
    actualPng.data,
    expectedPng.data,
    undefined,
    width,
    height,
    { threshold: 0.1 },
  );
  const diffRatio = diffPixels / (width * height);
  expect(
    diffRatio,
    `${snapshotPath} differs by ${diffPixels} pixels (${(diffRatio * 100).toFixed(2)}%)`,
  ).toBeLessThanOrEqual(maxDiffRatio);
}
