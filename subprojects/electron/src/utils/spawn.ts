/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import child_process, {
  type ChildProcess,
  type SpawnOptionsWithoutStdio,
  type SpawnOptionsWithStdioTuple,
  type StdioNull,
} from 'child_process';

export default function spawn(
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio,
): ChildProcess {
  const commonOptions: SpawnOptionsWithStdioTuple<
    StdioNull,
    StdioNull,
    StdioNull
  > = {
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: false,
  };
  if (process.platform === 'win32') {
    return child_process.spawn(
      'cmd.exe',
      ['/q', '/c', `${command}.bat`, ...args],
      {
        ...options,
        ...commonOptions,
        windowsHide: true,
      },
    );
  } else {
    return child_process.spawn(command, args, {
      ...options,
      ...commonOptions,
    });
  }
}
