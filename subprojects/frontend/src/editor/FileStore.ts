/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { computed, makeObservable, observable } from 'mobx';

export default abstract class FileStore {
  fileName: string | undefined;

  constructor(initialFileName: string | undefined) {
    this.fileName = initialFileName;
    makeObservable(this, {
      fileName: observable,
      simpleName: computed,
      simpleNameOrFallback: computed,
      openFile: false,
      saveFile: false,
      saveFileAs: false,
    });
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

  abstract openFile(): boolean;

  abstract saveFile(text: string): boolean;

  abstract saveFileAs(text: string): boolean;
}
