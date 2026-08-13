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

import startXvfb, { getXvfbMissingMessage } from './startXvfb';

export default class HeadlessServerManager extends ServerManager {
  constructor(public readonly endpoint: string) {
    // Chromium is well-behaved and only the main process needs killing.
    super('cli.HeadlessServerManager', false);
  }

  protected override async spawnChild(): Promise<ChildProcess> {
    const needsXvfb =
      process.platform === 'linux' &&
      !process.env['DISPLAY'] &&
      !process.env['WAYLAND_DISPLAY'];

    const newEnv: NodeJS.ProcessEnv = {
      ...process.env,
      REFINERY_IPC_ENDPOINT: this.endpoint,
      REFINERY_LOG_DESTINATION: 'stdout',
    };
    delete newEnv['ELECTRON_RUN_AS_NODE'];

    let xvfbProcess: ChildProcess | undefined;
    if (needsXvfb) {
      let display: string;
      try {
        ({ display, process: xvfbProcess } = await startXvfb());
      } catch (error) {
        const message = getXvfbMissingMessage(error);
        if (message) {
          this.logger.error(message);
        }
        throw error;
      }
      newEnv['DISPLAY'] = display;
    }

    // Chromium is chatty on stderr even in normal operation, so this is
    // opt-in (e.g. for the e2e tests) rather than always on.
    const logChromium = process.env['REFINERY_LOG_CHROMIUM'] === '1';

    // Chromium's SUID sandbox needs `chrome-sandbox` to be owned by root
    // with mode 4755 (or user namespaces to be available and permitted),
    // which is only set up by the installers for packaged builds (see
    // `after-install.tpl`), not by an unpacked `electron-builder` output.
    const electronArgs =
      process.env['REFINERY_NO_SANDBOX'] === '1' ? ['--no-sandbox'] : [];
    const child = child_process.spawn(process.argv0, electronArgs, {
      env: newEnv,
      stdio: ['ignore', 'pipe', logChromium ? 'pipe' : 'ignore'],
      detached: false,
    });

    // The Xvfb server only exists for this Electron process, so it never
    // needs to outlive it, however it ends up going away.
    if (xvfbProcess) {
      child.once('error', () => xvfbProcess.kill());
      child.once('exit', () => xvfbProcess.kill());
    }

    const readlines: ReturnType<typeof createInterface>[] = [];

    if (child.stdout) {
      const stdoutReadline = createInterface({
        input: child.stdout,
        crlfDelay: Infinity,
      });
      stdoutReadline.on('line', (line) => {
        destination.write(`${line}${EOL}`);
      });
      readlines.push(stdoutReadline);
    }

    if (logChromium && child.stderr) {
      const stderrReadline = createInterface({
        input: child.stderr,
        crlfDelay: Infinity,
      });
      stderrReadline.on('line', (line) => {
        destination.write(`[stderr] ${line}${EOL}`);
      });
      readlines.push(stderrReadline);
    }

    for (const event of ['error', 'exit'] as const) {
      child.on(event, () => {
        readlines.forEach((readline) => readline.close());
      });
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
