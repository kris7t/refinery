/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import child_process from 'node:child_process';
import { once } from 'node:events';

import getLogger from '../utils/getLogger';

import getElectronSpawnCommand, {
  getXvfbRunMissingMessage,
} from './getElectronSpawnCommand';

const log = getLogger('cli.launchGUI');

/**
 * Launches the GUI in a detached process and waits for it to spawn
 * successfully, since a failure (e.g. `xvfb-run` missing) is otherwise
 * reported asynchronously, after we'd already have exited.
 */
export default async function launchGUI(args: string[]): Promise<boolean> {
  const newEnv = { ...process.env };
  delete newEnv['ELECTRON_RUN_AS_NODE'];
  const { command, args: electronArgs } = getElectronSpawnCommand(
    process.argv0,
  );
  const child = child_process.spawn(command, [...electronArgs, ...args], {
    env: newEnv,
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true,
  });
  try {
    await once(child, 'spawn');
    return true;
  } catch (error) {
    const message = getXvfbRunMissingMessage(command, error);
    if (message) {
      log.error(message);
    } else {
      log.error({ err: error }, 'Failed to launch Electron');
    }
    return false;
  } finally {
    child.unref();
  }
}
