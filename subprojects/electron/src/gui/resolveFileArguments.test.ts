/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, test } from 'vitest';

import resolveFileArguments, {
  resolveFileArgument,
} from './resolveFileArguments';

const workingDirectory = path.resolve('/working/directory');

test('resolves relative paths against the working directory', () => {
  expect(resolveFileArgument('model.problem', workingDirectory)).toBe(
    path.join(workingDirectory, 'model.problem'),
  );
});

test('preserves absolute paths', () => {
  const filePath = path.resolve('/models/model.problem');
  expect(resolveFileArgument(filePath, workingDirectory)).toBe(filePath);
});

test('converts file URLs to absolute paths', () => {
  const filePath = path.resolve('/models/model with spaces.problem');
  expect(
    resolveFileArgument(pathToFileURL(filePath).href, workingDirectory),
  ).toBe(filePath);
});

test('ignores non-file URLs and invalid file URLs', () => {
  expect(
    resolveFileArgument('https://refinery.tools', workingDirectory),
  ).toBeUndefined();
  expect(
    resolveFileArgument('file:///%E0%A4%A', workingDirectory),
  ).toBeUndefined();
});

describe('options', () => {
  test('ignores option-like arguments', () => {
    expect(
      resolveFileArguments(['--no-sandbox', 'model.problem'], workingDirectory),
    ).toEqual([path.join(workingDirectory, 'model.problem')]);
  });

  test('treats arguments after `--` as paths', () => {
    expect(
      resolveFileArguments(['--', '-model.problem'], workingDirectory),
    ).toEqual([path.join(workingDirectory, '-model.problem')]);
  });
});
