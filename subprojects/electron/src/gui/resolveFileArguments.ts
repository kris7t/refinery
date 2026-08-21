/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveFileArgument(
  argument: string,
  workingDirectory: string,
): string | undefined {
  if (argument === '') {
    return undefined;
  }
  if (/^file:/i.test(argument)) {
    try {
      return path.resolve(fileURLToPath(argument));
    } catch {
      return undefined;
    }
  }
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(argument)) {
    return undefined;
  }
  return path.resolve(workingDirectory, argument);
}

export default function resolveFileArguments(
  args: string[],
  workingDirectory: string,
): string[] {
  const filePaths: string[] = [];
  let positionalOnly = false;
  for (const argument of args) {
    if (!positionalOnly && argument === '--') {
      positionalOnly = true;
      continue;
    }
    if (!positionalOnly && argument.startsWith('-')) {
      continue;
    }
    const filePath = resolveFileArgument(argument, workingDirectory);
    if (filePath !== undefined) {
      filePaths.push(filePath);
    }
  }
  return filePaths;
}
