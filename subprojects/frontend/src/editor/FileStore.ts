/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

export default interface FileStore {
  readonly fileName: string | undefined;

  readonly simpleName: string | undefined;

  readonly simpleNameOrFallback: string;

  openFile(): boolean;

  saveFile(text: string): boolean;

  saveFileAs(text: string): boolean;
}
