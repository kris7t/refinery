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

export const FileResult = z.object({ name: z.string() });

export type FileResult = z.infer<typeof FileResult>;

export const OpenFileResult = FileResult.extend({ text: z.string() });

export type OpenFileResult = z.infer<typeof OpenFileResult>;

const FileError = z.object({
  error: z.literal(true),
  name: z.string().optional(),
  reason: z.enum(['alreadyOpen', 'invalidUtf8']).optional(),
});

export const FileErrorResult = FileError.optional();

export type FileErrorResult = z.infer<typeof FileErrorResult>;

export const FileResultOrError = z.union([FileResult, FileError]).optional();

export type FileResultOrError = z.infer<typeof FileResultOrError>;

export const OpenFileResultOrError = z
  .union([OpenFileResult, FileError])
  .optional();

export type OpenFileResultOrError = z.infer<typeof OpenFileResultOrError>;

export const ReadFileResult = z
  .union([OpenFileResult, z.object({ hash: z.string() }), FileError])
  .optional();

export type ReadFileResult = z.infer<typeof ReadFileResult>;

export default interface RefineryContextBridge {
  logLevel: string;
  log(obj: object): void;
  getBackendConfig(): Promise<BackendConfig>;
  onServerStateChange(callback: ServerStateChangeCallback): void;
  setThemeSource(themeSource: ThemeSource): void;
  onThemeSourceChange(callback: ThemeSourceChangeCallback): void;
  readFile(): Promise<ReadFileResult>;
  openFile(newWindow?: boolean): Promise<OpenFileResultOrError>;
  clearFile(): Promise<FileErrorResult>;
  openHash(hash: string): Promise<FileErrorResult>;
  saveFile(text: string): Promise<FileResultOrError>;
  saveFileAs(text: string): Promise<FileResultOrError>;
  openDialog(id: string): void;
  closeDialog(id: string): void;
}
