/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { action, makeObservable } from 'mobx';

import type RefineryContextBridge from '../RefineryContextBridge';
import type { FileResult, OpenFileResult } from '../RefineryContextBridge';
import getLogger from '../utils/getLogger';

import FileStore from './FileStore';

const log = getLogger('editor.ElectronFileStore');

export default class ElectronFileStore extends FileStore {
  constructor(
    private readonly refinery: RefineryContextBridge,
    initialFileName: string | undefined,
    private readonly onFileOpened: (text: string) => void,
    private readonly onFileSaved: () => void,
  ) {
    super(initialFileName);
    makeObservable<ElectronFileStore, 'fileOpened' | 'fileSaved' | 'setFile'>(
      this,
      {
        openFile: action,
        openShare: false,
        fileOpened: action,
        saveFile: action,
        saveFileAs: action,
        fileSaved: action,
        setFile: action,
      },
    );
  }

  openFile(): boolean {
    this.refinery
      .openFile()
      .then((result) => this.fileOpened(result))
      .catch((err: unknown) => log.error({ err }, 'Failed to open file'));
    return true;
  }

  openShare(fragment: string): void {
    this.refinery
      .openHash(fragment)
      .catch((err: unknown) =>
        log.error({ err }, 'Failed to open shared model'),
      );
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
}
