/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { makeAutoObservable } from 'mobx';

import type RefineryContextBridge from '../RefineryContextBridge';
import type { FileResult, OpenFileResult } from '../RefineryContextBridge';
import getLogger from '../utils/getLogger';

import type FileStore from './FileStore';

const log = getLogger('editor.ElectronFileStore');

export default class ElectronFileStore implements FileStore {
  fileName: string | undefined;

  constructor(
    private readonly refinery: RefineryContextBridge,
    private readonly onFileOpened: (text: string) => void,
    private readonly onFileSaved: () => void,
  ) {
    makeAutoObservable<
      ElectronFileStore,
      'onFileOpened' | 'onFileSaved' | 'refinery'
    >(this, {
      refinery: false,
      onFileOpened: false,
      onFileSaved: false,
    });
  }

  openFile(): boolean {
    this.refinery
      .openFile()
      .then((result) => this.fileOpened(result))
      .catch((err: unknown) => log.error({ err }, 'Failed to open file'));
    return true;
  }

  private fileOpened(result: OpenFileResult | undefined): void {
    if (result === undefined) {
      return;
    }
    this.onFileOpened(result.text);
    this.setFile(result);
  }

  saveFile(text: string): boolean {
    this.refinery
      .saveFile(text)
      .then((result) => this.fileSaved(result))
      .catch((err: unknown) => log.error({ err }, 'Failed to save file'));
    return true;
  }

  saveFileAs(text: string): boolean {
    this.refinery
      .saveFileAs(text)
      .then((result) => this.fileSaved(result))
      .catch((err: unknown) => log.error({ err }, 'Failed to save file'));
    return true;
  }

  private fileSaved(result: FileResult | undefined): void {
    if (result === undefined) {
      return;
    }
    this.setFile(result);
    this.onFileSaved();
  }

  private setFile({ name }: FileResult): void {
    log.info('Opened file: %s', name);
    this.fileName = name;
  }

  get simpleName(): string | undefined {
    const { fileName } = this;
    if (fileName === undefined) {
      return undefined;
    }
    const index = fileName.lastIndexOf('.');
    if (index < 0) {
      return fileName;
    }
    return fileName.substring(0, index);
  }

  get simpleNameOrFallback(): string {
    return this.simpleName ?? 'graph';
  }
}
