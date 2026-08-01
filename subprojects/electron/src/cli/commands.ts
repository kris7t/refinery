/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

const commands = [
  'generate',
  'g',
  'concretize',
  'c',
  'check',
  'v',
  'render',
  'r'
] as const;

export default commands;

export type Command = typeof commands[number];
