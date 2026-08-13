/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { once } from 'node:events';
import { Readable } from 'node:stream';

export interface Xvfb {
  readonly display: string;
  readonly process: ChildProcess;
}

/**
 * Starts a headless X server on a free display number and resolves once
 * it's ready to accept connections.
 *
 * We drive `-displayfd` (the building block `xvfb-run` itself uses to pick a
 * free display) directly instead of shelling out to `xvfb-run`, so that Xvfb
 * ends up as our own direct child rather than a grandchild hidden behind a
 * bash wrapper. `xvfb-run`'s shell-script cleanup doesn't reliably run when
 * the wrapper is killed externally (e.g. because a caller timed out), which
 * was leaving orphan `Xvfb` (and, transitively, Electron) processes behind
 * in CI. Owning the process ourselves means we can kill it directly instead.
 */
export default async function startXvfb(): Promise<Xvfb> {
  const xvfbProcess = spawn(
    'Xvfb',
    ['-displayfd', '3', '-screen', '0', '1280x1024x24'],
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe'] },
  );
  const displayFd = xvfbProcess.stdio[3];
  if (!(displayFd instanceof Readable)) {
    throw new Error('Failed to open a pipe for the Xvfb display number');
  }
  let output = '';
  displayFd.on('data', (chunk: Buffer) => {
    output += chunk.toString('utf-8');
  });
  await Promise.race([
    once(displayFd, 'end'),
    once(xvfbProcess, 'error').then(([error]) => {
      throw error;
    }),
  ]);
  return { display: `:${output.trim()}`, process: xvfbProcess };
}

/**
 * If `error` is Xvfb (as spawned by {@link startXvfb}) failing to spawn
 * because it isn't installed, returns a message explaining how to fix that
 * -- otherwise returns `undefined`.
 */
export function getXvfbMissingMessage(error: unknown): string | undefined {
  if (
    error === null ||
    typeof error !== 'object' ||
    !('code' in error) ||
    error.code !== 'ENOENT'
  ) {
    return undefined;
  }
  return (
    'No DISPLAY or WAYLAND_DISPLAY is set and `Xvfb` was not found. ' +
    'Install Xvfb, or run with a display, to render graphical output.'
  );
}
