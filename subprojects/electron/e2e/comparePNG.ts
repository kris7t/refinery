/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { expect } from 'vitest';

export interface ComparePNGOptions {
  /** Fraction of pixels (0 to 1) allowed to differ before the comparison fails. */
  maxDiffRatio?: number;
  /**
   * Pixels of width/height slack to tolerate (and crop away before
   * diffing), for comparing outputs of independent rendering pipelines that
   * round page dimensions slightly differently.
   */
  maxSizeDiff?: number;
  /** Label used in assertion failure messages. */
  label?: string;
}

function cropTopLeft(png: PNG, width: number, height: number): PNG {
  const cropped = new PNG({ width, height });
  PNG.bitblt(png, cropped, 0, 0, width, height, 0, 0);
  return cropped;
}

/**
 * Approximately compares two PNGs pixel by pixel, since rendering isn't
 * guaranteed to be byte-identical across platforms or rendering pipelines.
 */
export default function comparePNG(
  actual: Buffer,
  expected: Buffer,
  {
    maxDiffRatio = 0.01,
    maxSizeDiff = 0,
    label = 'image',
  }: ComparePNGOptions = {},
): void {
  const actualPng = PNG.sync.read(actual);
  const expectedPng = PNG.sync.read(expected);
  const widthDiff = Math.abs(actualPng.width - expectedPng.width);
  const heightDiff = Math.abs(actualPng.height - expectedPng.height);
  const sizeMessage = `${label} has an unexpected size (actual: ${actualPng.width}x${actualPng.height}, expected: ${expectedPng.width}x${expectedPng.height})`;
  expect(widthDiff, sizeMessage).toBeLessThanOrEqual(maxSizeDiff);
  expect(heightDiff, sizeMessage).toBeLessThanOrEqual(maxSizeDiff);

  const width = Math.min(actualPng.width, expectedPng.width);
  const height = Math.min(actualPng.height, expectedPng.height);
  const croppedActual = cropTopLeft(actualPng, width, height);
  const croppedExpected = cropTopLeft(expectedPng, width, height);
  const diffPixels = pixelmatch(
    croppedActual.data,
    croppedExpected.data,
    undefined,
    width,
    height,
    { threshold: 0.1 },
  );
  const diffRatio = diffPixels / (width * height);
  expect(
    diffRatio,
    `${label} differs by ${diffPixels} pixels (${(diffRatio * 100).toFixed(2)}%)`,
  ).toBeLessThanOrEqual(maxDiffRatio);
}
