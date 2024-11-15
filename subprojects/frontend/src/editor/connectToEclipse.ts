/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { IReactionDisposer, reaction } from 'mobx';

import type EditorStore from './EditorStore';

export class EclipseConnector {
  private disposers: IReactionDisposer[];

  constructor(
    private readonly editorStore: EditorStore,
    private readonly hostAPICallback: (request: string) => string | null,
  ) {
    window.refineryEclipsePageAPI = (request) => this.pageAPI(request);
    this.disposers = [
      reaction(
        () => editorStore.unsavedChanges,
        (dirty) => {
          this.hostAPI({
            request: 'setDirty',
            dirty,
          });
        },
        { fireImmediately: true },
      ),
      reaction(
        () => editorStore.canUndo,
        (canUndo) => {
          this.hostAPI({
            request: 'setCanUndo',
            canUndo,
          });
        },
        { fireImmediately: true },
      ),
      reaction(
        () => editorStore.canRedo,
        (canRedo) => {
          this.hostAPI({
            request: 'setCanRedo',
            canRedo,
          });
        },
        { fireImmediately: true },
      ),
    ];
    const showLineNumbers = this.hostAPI({ request: 'getShowLineNumbers' });
    editorStore.setShowLineNumbers(!!showLineNumbers);
  }

  private hostAPI(request: object): unknown {
    const result = this.hostAPICallback(JSON.stringify(request));
    return result === null ? undefined : JSON.parse(result);
  }

  private pageAPI(request: unknown): void {
    if (
      typeof request !== 'object' ||
      request === null ||
      !('request' in request)
    ) {
      return;
    }
    let result: object | undefined;
    if (request.request === 'getContents') {
      result = { contents: this.editorStore.state.sliceDoc() };
    } else if (request.request === 'clearDirty') {
      this.editorStore.clearUnsavedChanges();
    } else if (request.request === 'undo') {
      this.editorStore.undo();
    } else if (request.request === 'redo') {
      this.editorStore.redo();
    } else if (request.request === 'findReplace') {
      this.editorStore.searchPanel.open();
    } else {
      result = { error: 'Unknown request' };
    }
    if (result !== undefined && 'id' in request) {
      this.hostAPI({ ...result, id: request.id });
    }
  }

  save(): void {
    this.hostAPI({ request: 'save' });
  }

  saveAs(): void {
    this.hostAPI({ request: 'saveAs' });
  }

  dispose() {
    this.disposers.forEach((disposer) => disposer());
  }
}

export default function connectToEclipse(
  editorStore: EditorStore,
): EclipseConnector | undefined {
  if (!('refineryEclipseHostAPI' in window)) {
    return undefined;
  }
  return new EclipseConnector(editorStore, window.refineryEclipseHostAPI);
}
