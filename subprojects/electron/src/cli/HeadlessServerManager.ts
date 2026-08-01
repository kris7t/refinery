/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import child_process, { type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import { access } from 'node:fs/promises';
import { EOL } from 'node:os';
import { createInterface } from 'node:readline';

import ServerManager from '../utils/ServerManager';
import { destination } from '../utils/logger';

export default class HeadlessServerManager extends ServerManager {
  constructor(public readonly endpoint: string) {
    // Chromium is well-behaved and only the main process needs killing.
    super('cli.HeadlessServerManager', false);
  }

  protected override spawnChild(): ChildProcess {
    const newEnv: NodeJS.ProcessEnv = {
      ...process.env,
      REFINERY_IPC_ENDPOINT: this.endpoint,
      REFINERY_LOG_DESTINATION: 'stdout',
    };
    delete newEnv['ELECTRON_RUN_AS_NODE'];
    const child = child_process.spawn(process.argv0, [], {
      env: newEnv,
      // Ignore Chromium log noise written to stderr.
      stdio: ['ignore', 'pipe', 'ignore'],
      detached: false,
    });
    const readline = createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });
    readline.on('line', (line) => {
      destination.write(`${line}${EOL}`);
    });
    for (const event of ['error', 'exit'] as const) {
      child.on(event, () => readline.close());
    }
    return child;
  }

  protected override async checkHealthy(): Promise<boolean> {
    try {
      await access(this.endpoint, fs.constants.F_OK);
    } catch {
      return false;
    }
    return true;
  }
}
