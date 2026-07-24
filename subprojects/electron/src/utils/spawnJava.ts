/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import child_process, { type SpawnOptionsWithoutStdio } from 'node:child_process';
import { rmSync, type Dirent } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { nanoid } from 'nanoid';

import type { SpawnedChild } from '../ServerManager';

import { onCleanup } from './cleanup';
import getLogger from './getLogger';
import { isWindows } from './platform';

const logger = getLogger('utils.spawnJava');

/**
 * Root for all backend temp directories. Each Electron instance owns the
 * `<TEMP_ROOT>/<pid>` subtree, so runs never collide and orphans can be
 * attributed back to the process that created them.
 */
const TEMP_ROOT = path.join(os.tmpdir(), 'refinery-electron');

/** Liveness probe via signal 0; treats permission errors as "still alive". */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // ESRCH → the process is gone; EPERM → it exists but is owned by another
    // user, so we must not touch its directory.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

let sweepPromise: Promise<void> | undefined;

/**
 * Removes temp directories left behind by Electron instances that are no longer
 * running (e.g. after a crash where {@link SpawnedChild.onStopped} never ran).
 * Never rejects: a failed sweep must not block the backend from starting.
 */
async function sweepOrphans(): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await readdir(TEMP_ROOT, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.error({ err: error }, 'Failed to scan temporary directory');
    }
    return;
  }
  await Promise.all(
    entries.map(async (entry) => {
      const pid = Number.parseInt(entry.name, 10);
      if (
        !entry.isDirectory() ||
        !Number.isInteger(pid) ||
        isProcessAlive(pid)
      ) {
        return;
      }
      await rm(path.join(TEMP_ROOT, entry.name), {
        recursive: true,
        force: true,
      }).catch((err: unknown) =>
        logger.error({ err }, 'Failed to reap orphaned temporary directory'),
      );
    }),
  );
}

/**
 * Synchronously removes this process's temp subtree. Registered via
 * `onCleanup` so it runs on `will-quit`, clearing the now-empty `<pid>`
 * directory that {@link SpawnedChild.onStopped} leaves behind after a clean
 * shutdown. Synchronous because `will-quit` does not await async work.
 */
function removeTempDir(): void {
  rmSync(path.join(TEMP_ROOT, String(process.pid)), {
    recursive: true,
    force: true,
  });
}

onCleanup(removeTempDir);

/** Escapes a value for inclusion as a quoted token in a JDK argument file. */
function argFileQuote(value: string): string {
  // Backslash first, so the escape we add for `"` isn't itself doubled.
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

export default async function spawnJava(
  mainClass: string,
  args: string[],
  options: SpawnOptionsWithoutStdio,
): Promise<SpawnedChild> {
  const javaDir = path.resolve(process.resourcesPath, 'jre');
  const javaBinDir = path.join(javaDir, 'bin');
  const pathEnv = process.env['PATH'];
  const newPathEnv =
    pathEnv === undefined || pathEnv === ''
      ? javaBinDir
      : `${javaBinDir}${path.delimiter}${pathEnv}`;
  const javaBinary = path.join(javaBinDir, isWindows ? 'java.exe' : 'java');
  const libDir = path.resolve(process.resourcesPath, 'lib');
  const libs = (await readdir(libDir))
    .filter((entry) => entry.endsWith('.jar'))
    .map((entry) => path.join(libDir, entry))
    .join(path.delimiter);
  const longArgs = [
    '--enable-native-access=ALL-UNNAMED',
    '--sun-misc-unsafe-memory-access=allow',
    ...[options.env?.['JAVA_OPTS'], options.env?.['REFINERY_JAVA_OPTS']].filter(
      Boolean,
    ),
    '-classpath',
    argFileQuote(libs),
    mainClass,
  ];

  // Reclaim temp directories from previously crashed instances before we
  // add our own.
  await (sweepPromise ??= sweepOrphans());

  const tempDir = path.join(TEMP_ROOT, String(process.pid), nanoid());
  await mkdir(tempDir, { recursive: true });

  const argsFile = path.join(tempDir, 'args.txt');
  await writeFile(argsFile, longArgs.join(os.EOL), 'utf-8');
  return {
    child: child_process.spawn(
      javaBinary,
      [`@${argsFile}`, ...args],
      {
        ...options,
        env: {
          ...(options.env ?? {}),
          PATH: newPathEnv,
          JAVA_HOME: javaDir,
        },
        stdio: ['ignore', 'inherit', 'inherit'],
        detached: false,
        ...(isWindows ? { windowsHide: true } : {}),
      },
    ),
    onStopped: () => {
      rm(tempDir, { recursive: true, force: true }).catch((error) => {
        logger.error({ err: error }, 'Error while removing temporary files');
      });
    },
  };
}
