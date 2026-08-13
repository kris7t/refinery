/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { Readable } from 'node:stream';

export interface Xvfb {
  readonly display: string;
  stop(): void;
}

/**
 * Starts a headless X server on a free display number and resolves once it's
 * ready to accept connections.
 */
export default async function startXvfb(): Promise<Xvfb> {
  const xvfb = spawn(
    'Xvfb',
    ['-displayfd', '3', '-screen', '0', '1280x1024x24'],
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe'] },
  );
  const displayFd = xvfb.stdio[3];
  if (!(displayFd instanceof Readable)) {
    throw new Error('Failed to open a pipe for the Xvfb display number');
  }
  let output = '';
  displayFd.on('data', (chunk: Buffer) => {
    output += chunk.toString('utf-8');
  });
  await once(displayFd, 'end');
  return {
    display: `:${output.trim()}`,
    stop: () => xvfb.kill(),
  };
}
