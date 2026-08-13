/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { once } from 'node:events';
import { rmSync } from 'node:fs';
import { chmod, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { nanoid } from 'nanoid';

import cleanup, { onCleanup } from '../utils/cleanup';
import getLogger from '../utils/getLogger';
import { isWindows } from '../utils/platform';
import spawnJava from '../utils/spawnJava';

import HeadlessServerManager from './HeadlessServerManager';
import isHeadlessNeeded from './isHeadlessNeeded';
import launchGUI from './launchGUI';
import shouldLaunchGUI from './shouldLaunchGUI';

const log = getLogger('cli');

async function getEndpoint(): Promise<string> {
  if (isWindows) {
    return `\\\\.\\pipe\\refinery-cli-${nanoid()}`;
  }
  const tempDir = await mkdtemp(path.join(tmpdir(), 'refinery-cli-'));
  onCleanup(() =>
    rmSync(tempDir, {
      recursive: true,
      force: true,
    }),
  );
  await chmod(tempDir, 0o700);
  return path.join(tempDir, 'sock');
}

async function runCLI(): Promise<number | null> {
  const args = process.argv.slice(2);

  if (shouldLaunchGUI(args)) {
    return (await launchGUI(args)) ? 0 : 1;
  }

  const newEnv: NodeJS.ProcessEnv = {
    ...process.env,
    REFINERY_SHOW_GRAPHICAL_OUTPUT: '1',
  };

  let headless: HeadlessServerManager | undefined;
  if (await isHeadlessNeeded(args)) {
    const endpoint = await getEndpoint();
    headless = new HeadlessServerManager(endpoint);
    onCleanup(() => headless?.stop());
    newEnv['REFINERY_IPC_ENDPOINT'] = endpoint;
  }

  const childProcess = spawnJava(
    'refinery-generator-cli',
    'tools.refinery.generator.cli.RefineryCli',
    args,
    { interactive: true, env: newEnv },
  );

  for (const signal of ['SIGINT', 'SIGQUIT', 'SIGTERM'] as const) {
    process.on(signal, () => childProcess.kill(signal));
  }

  if (headless) {
    headless.start().catch((error) => {
      log.error({ err: error }, 'Failed to start headless Electron');
      childProcess.kill('SIGTERM');
    });
  }

  const [code] = (await once(childProcess, 'exit')) as [number | null];
  return code;
}

runCLI()
  .catch((error) => log.fatal({ err: error }, 'Error while executing CLI'))
  .finally(cleanup)
  .then((code) => process.exit(code ?? -1))
  .catch((error) => log.fatal({ err: error }, 'Exit error'));
