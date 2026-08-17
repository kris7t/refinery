/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { z } from 'zod/v4';

import type BackendConfig from './xtext/BackendConfig';

export type ServerStateChangeCallback = (healthy: boolean) => void;

export const ThemeSource = z.enum(['system', 'light', 'dark'] as const);

export type ThemeSource = z.infer<typeof ThemeSource>;

export type ThemeSourceChangeCallback = (themeSource: ThemeSource) => void;

export default interface RefineryContextBridge {
  logLevel: string;
  log(obj: object): void;
  getBackendConfig(): Promise<BackendConfig>;
  onServerStateChange(callback: ServerStateChangeCallback): void;
  setThemeSource(themeSource: ThemeSource): void;
  onThemeSourceChange(callback: ThemeSourceChangeCallback): void;
  openDialog(id: string): void;
  closeDialog(id: string): void;
}
