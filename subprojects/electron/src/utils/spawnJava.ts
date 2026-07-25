/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import child_process, {
  ChildProcess,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process';
import path from 'node:path';

import { isWindows } from './platform';

export default function spawnJava(
  packageName: string,
  mainClass: string,
  args: string[],
  options: SpawnOptionsWithoutStdio,
): ChildProcess {
  const javaDir = path.resolve(process.resourcesPath, 'jre');
  const javaBinDir = path.join(javaDir, 'bin');
  const pathEnv = process.env['PATH'];
  const newPathEnv =
    pathEnv === undefined || pathEnv === ''
      ? javaBinDir
      : `${javaBinDir}${path.delimiter}${pathEnv}`;
  const javaBinary = path.join(javaBinDir, isWindows ? 'java.exe' : 'java');

  const libDir = path.resolve(
    process.resourcesPath,
    'lib',
  );
  const pathingJar = path.join(libDir, `${packageName}-all.jar`);

  const newEnv: NodeJS.ProcessEnv = {
    ...(options.env ?? {}),
    PATH: newPathEnv,
    JAVA_HOME: javaDir,
    CLASSPATH: pathingJar,
  };
  // Do not inherit Java options from the environment to ensure portability.
  delete newEnv['_JAVA_OPTIONS'];
  delete newEnv['JDK_JAVA_OPTIONS'];
  delete newEnv['JAVA_TOOL_OPTIONS'];

  return child_process.spawn(
    javaBinary,
    [
      '--enable-native-access=ALL-UNNAMED',
      '--sun-misc-unsafe-memory-access=allow',
      mainClass,
      ...args,
    ],
    {
      ...options,
      env: newEnv,
      stdio: ['ignore', 'inherit', 'inherit'],
      detached: false,
      ...(isWindows ? { windowsHide: true } : {}),
    },
  );
}
