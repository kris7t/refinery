/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { spawn } from 'node:child_process';

export interface CliResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** Spawns the packaged CLI shim and collects its output. */
export default function runCli(
  cliPath: string,
  args: string[],
): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cliPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });
    child.once('error', reject);
    child.once('exit', (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}
