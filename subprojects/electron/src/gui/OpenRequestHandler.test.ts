/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import type { BrowserWindow } from 'electron';
import { describe, expect, test, vi } from 'vitest';

import OpenRequestHandler from './OpenRequestHandler';

function createHandler() {
  const handler = new OpenRequestHandler();
  const openImmediately = vi.fn((filePath: string | undefined) => {
    return { filePath } as unknown as BrowserWindow;
  });
  return { handler, openImmediately };
}

test('opens an untitled window when there are no requests', () => {
  const { handler, openImmediately } = createHandler();

  expect(handler.initialize(openImmediately)).toEqual([
    { filePath: undefined },
  ]);
  expect(openImmediately).toHaveBeenCalledWith(undefined);
});

test('initial files replace the default untitled window', () => {
  const { handler, openImmediately } = createHandler();
  handler.openInitial('/models/first.problem');
  handler.openInitial('/models/second.problem');

  expect(handler.initialize(openImmediately)).toEqual([
    { filePath: '/models/first.problem' },
    { filePath: '/models/second.problem' },
  ]);
});

test('later requests do not replace the default untitled window', () => {
  const { handler, openImmediately } = createHandler();
  handler.open('/models/model.problem');
  handler.open();

  expect(handler.initialize(openImmediately)).toEqual([
    { filePath: undefined },
    { filePath: '/models/model.problem' },
    { filePath: undefined },
  ]);
});

test('later requests remain additional to initial files', () => {
  const { handler, openImmediately } = createHandler();
  handler.openInitial('/models/first.problem');
  handler.open('/models/second.problem');
  handler.open();

  expect(handler.initialize(openImmediately)).toEqual([
    { filePath: '/models/first.problem' },
    { filePath: '/models/second.problem' },
    { filePath: undefined },
  ]);
});

test('opens requests immediately after initialization', () => {
  const { handler, openImmediately } = createHandler();
  handler.initialize(openImmediately);
  openImmediately.mockClear();

  expect(handler.open('/models/model.problem')).toEqual({
    filePath: '/models/model.problem',
  });
  expect(handler.open()).toEqual({ filePath: undefined });
  expect(handler.openInitial('/models/other.problem')).toEqual({
    filePath: '/models/other.problem',
  });
  expect(openImmediately).toHaveBeenCalledTimes(3);
});

describe('initialization', () => {
  test('can only happen once', () => {
    const { handler, openImmediately } = createHandler();
    handler.initialize(openImmediately);

    expect(() => handler.initialize(openImmediately)).toThrow(
      'OpenRequestHandler is already initialized',
    );
  });
});
