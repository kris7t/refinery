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
  {
    interactive = false,
    ...options
  }: SpawnOptionsWithoutStdio & { interactive?: boolean },
): ChildProcess {
  const libDir = path.resolve(process.resourcesPath, 'lib');
  const javaDir = path.resolve(process.resourcesPath, 'jre');
  const javaBinDir = path.join(javaDir, 'bin');
  const javaBinary = path.join(javaBinDir, isWindows ? 'java.exe' : 'java');
  const pathingJar = path.join(libDir, `${packageName}-all.jar`);
  const nativesDir = path.join(libDir, 'native');

  const pathEnv = process.env['PATH'];
  // For Windows: make sure the native libraries are present of `PATH`.
  const extraPaths = [nativesDir, javaDir].join(path.delimiter);
  const newPathEnv =
    pathEnv === undefined || pathEnv === ''
      ? extraPaths
      : `${extraPaths}${path.delimiter}${pathEnv}`;

  const newEnv: NodeJS.ProcessEnv = {
    ...(options.env ?? {}),
    PATH: newPathEnv,
    JAVA_HOME: javaDir,
    CLASSPATH: pathingJar,
    // For Linux: dynamic linking for native libraries.
    LD_LIBRARY_PATH: nativesDir,
    // For macOS: dynamic linking for native libraries.
    DYLD_LIBRARY_PATH: nativesDir,
  };
  delete newEnv['ELECTRON_RUN_AS_NODE'];
  // Do not inherit Java options from the environment to ensure portability.
  delete newEnv['_JAVA_OPTIONS'];
  delete newEnv['JDK_JAVA_OPTIONS'];
  delete newEnv['JAVA_TOOL_OPTIONS'];
  // By default, `refinery-language-web` displays INFO messages to enable traceability
  // in a production Docker environment, but this gets noisy for desktop use.
  if (!('REFINERY_LOG_LEVEL' in newEnv)) {
    newEnv['REFINERY_LOG_LEVEL'] = 'WARN';
  }

  return child_process.spawn(
    javaBinary,
    [
      '--enable-native-access=ALL-UNNAMED',
      '--sun-misc-unsafe-memory-access=allow',
      `-Djava.library.path=${nativesDir}`,
      mainClass,
      ...args,
    ],
    {
      ...options,
      env: newEnv,
      stdio: [interactive ? 'inherit' : 'ignore', 'inherit', 'inherit'],
      detached: false,
      ...(isWindows ? { windowsHide: true } : {}),
    },
  );
}
