/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { action, makeObservable } from 'mobx';

import {
  REFINERY_CONTENT_TYPE,
  FILE_TYPE_OPTIONS,
  type OpenResult,
  type OpenTextFileResult,
  openTextFile,
  saveTextFile,
  saveBlob,
} from '../utils/fileIO';
import getLogger from '../utils/getLogger';

import FileStore from './FileStore';

const log = getLogger('editor.FileSystemAccessFileStore');

const FILE_PICKER_OPTIONS: FilePickerOptions = {
  id: 'problem',
  ...FILE_TYPE_OPTIONS,
};

export default class FileSystemAccessFileStore extends FileStore {
  private fileHandle: FileSystemFileHandle | undefined;

  constructor(
    initialFileName: string | undefined,
    private readonly onFileOpened: (text: string) => void,
    private readonly onFileSaved: () => void,
  ) {
    super(initialFileName);
    makeObservable<
      FileSystemAccessFileStore,
      'fileHandle' | 'fileOpened' | 'fileSavedAs' | 'setFile'
    >(this, {
      fileHandle: false,
      openFile: action,
      setFile: action,
      fileOpened: action,
      saveFile: action,
      saveFileAs: action,
      fileSavedAs: action,
    });
  }

  openFile(): boolean {
    openTextFile(FILE_PICKER_OPTIONS)
      .then((result) => this.fileOpened(result))
      .catch((err: unknown) => log.error({ err }, 'Failed to open file'));
    return true;
  }

  private setFile({ name, handle }: OpenResult): void {
    log.info('Opened file: %s', name);
    this.fileName = name;
    this.fileHandle = handle;
  }

  private fileOpened(result: OpenTextFileResult): void {
    this.onFileOpened(result.text);
    this.setFile(result);
  }

  saveFile(text: string): boolean {
    if (this.fileHandle === undefined) {
      return this.saveFileAs(text);
    }
    saveTextFile(this.fileHandle, text)
      .then(() => this.onFileSaved())
      .catch((err: unknown) => log.error({ err }, 'Failed to save file'));
    return true;
  }

  saveFileAs(text: string): boolean {
    const blob = new Blob([text], {
      type: REFINERY_CONTENT_TYPE,
    });
    saveBlob(
      blob,
      this.fileName ?? `${this.simpleNameOrFallback}.problem`,
      FILE_PICKER_OPTIONS,
    )
      .then((result) => this.fileSavedAs(result))
      .catch((err: unknown) => log.error({ err }, 'Failed to save file'));
    return true;
  }

  private fileSavedAs(result: OpenResult | undefined): void {
    if (result !== undefined) {
      this.setFile(result);
    }
    this.onFileSaved();
  }
}
