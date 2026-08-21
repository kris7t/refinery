/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { OpenRequest } from './OpenRequestHandler';

export function resolveOpenArgument(
  argument: string,
  workingDirectory: string,
): OpenRequest | undefined {
  if (argument === '') {
    return undefined;
  }
  if (/^file:/i.test(argument)) {
    try {
      return { filePath: path.resolve(fileURLToPath(argument)) };
    } catch {
      return undefined;
    }
  }
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(argument)) {
    try {
      const url = new URL(argument);
      const isWebURL = url.protocol === 'http:' || url.protocol === 'https:';
      const isRefineryURL =
        url.protocol === 'refinery:' &&
        url.hostname.toLowerCase() === 'open' &&
        (url.pathname === '' || url.pathname === '/');
      if ((isWebURL || isRefineryURL) && url.hash.startsWith('#/')) {
        return { hash: url.hash };
      }
    } catch {
      // Ignore malformed URLs.
    }
    return undefined;
  }
  return { filePath: path.resolve(workingDirectory, argument) };
}

export default function resolveOpenArguments(
  args: string[],
  workingDirectory: string,
): OpenRequest[] {
  const requests: OpenRequest[] = [];
  let positionalOnly = false;
  for (const argument of args) {
    if (!positionalOnly && argument === '--') {
      positionalOnly = true;
      continue;
    }
    if (!positionalOnly && argument.startsWith('-')) {
      continue;
    }
    const request = resolveOpenArgument(argument, workingDirectory);
    if (request !== undefined) {
      requests.push(request);
    }
  }
  return requests;
}
