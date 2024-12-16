/*
 * SPDX-FileCopyrightText: 2021-2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import type {
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete';
import {
  isolateHistory,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from '@codemirror/commands';
import {
  type Diagnostic,
  setDiagnostics,
  nextDiagnostic,
} from '@codemirror/lint';
import {
  type StateCommand,
  StateEffect,
  type Transaction,
  type TransactionSpec,
  type EditorState,
} from '@codemirror/state';
import { type Command, EditorView, type Tooltip } from '@codemirror/view';
import { makeAutoObservable, observable, runInAction } from 'mobx';
import { nanoid } from 'nanoid';

import type PWAStore from '../PWAStore';
import GraphStore from '../graph/GraphStore';
import {
  type OpenResult,
  type OpenTextFileResult,
  openTextFile,
  saveTextFile,
  saveBlob,
} from '../utils/fileIO';
import getLogger from '../utils/getLogger';
import type XtextClient from '../xtext/XtextClient';
import type { SemanticsModelResult } from '../xtext/xtextServiceResults';

import EditorErrors from './EditorErrors';
import GeneratedModelStore from './GeneratedModelStore';
import LintPanelStore from './LintPanelStore';
import SearchPanelStore from './SearchPanelStore';
import connectToEclipse, { type EclipseConnector } from './connectToEclipse';
import createEditorState, {
  createHistoryExtension,
  historyCompartment,
} from './createEditorState';
import { countDiagnostics } from './exposeDiagnostics';
import { type IOccurrence, setOccurrences } from './findOccurrences';
import {
  type IHighlightRange,
  setSemanticHighlighting,
} from './semanticHighlighting';

const log = getLogger('editor.EditorStore');

const REFINERY_CONTENT_TYPE = 'text/x-refinery';

const FILE_PICKER_OPTIONS: FilePickerOptions = {
  id: 'problem',
  types: [
    {
      description: 'Refinery files',
      accept: {
        [REFINERY_CONTENT_TYPE]: ['.problem', '.refinery'],
      },
    },
  ],
};

export default class EditorStore {
  readonly id: string;

  state: EditorState;

  private client: XtextClient | undefined;

  private eclipseConnector: EclipseConnector | undefined;

  view: EditorView | undefined;

  readonly searchPanel: SearchPanelStore;

  readonly lintPanel: LintPanelStore;

  readonly delayedErrors: EditorErrors;

  showLineNumbers = false;

  colorIdentifiers = true;

  disposed = false;

  analyzing = false;

  semanticsUpToDate = true;

  semanticsError: string | undefined;

  propagationRejected = false;

  graph: GraphStore;

  generatedModels = new Map<string, GeneratedModelStore>();

  selectedGeneratedModel: string | undefined;

  fileName: string | undefined;

  private fileHandle: FileSystemFileHandle | undefined;

  unsavedChanges = false;

  hexTypeHashes: string[] = [];

  concretize = false;

  selectedSymbolName: string | undefined;

  showComputed = false;

  constructor(
    initialValue: string,
    pwaStore: PWAStore,
    insideIDE: boolean,
    onUpdate: (text: string) => void,
  ) {
    this.id = nanoid();
    this.state = createEditorState(initialValue, insideIDE, this);
    this.delayedErrors = new EditorErrors(this);
    this.searchPanel = new SearchPanelStore(this);
    this.lintPanel = new LintPanelStore(this);
    (async () => {
      const { default: LazyXtextClient } = await import('../xtext/XtextClient');
      runInAction(() => {
        if (this.disposed) {
          return;
        }
        this.client = new LazyXtextClient(this, pwaStore, onUpdate);
        this.client.start();
      });
    })().catch((error) => {
      log.error('Failed to load XtextClient', error);
    });
    this.graph = new GraphStore(this);
    makeAutoObservable<EditorStore, 'client' | 'eclipseConnector'>(this, {
      id: false,
      state: observable.ref,
      client: observable.ref,
      eclipseConnector: false,
      view: observable.ref,
      searchPanel: false,
      lintPanel: false,
      contentAssist: false,
      hoverTooltip: false,
      goToDefinition: false,
      formatText: false,
    });
    this.eclipseConnector = connectToEclipse(this);
  }

  get opened(): boolean {
    return this.client?.webSocketClient.opened ?? false;
  }

  get opening(): boolean {
    return this.client?.webSocketClient.opening ?? true;
  }

  get disconnectedByUser(): boolean {
    return this.client?.webSocketClient.disconnectedByUser ?? false;
  }

  get networkMissing(): boolean {
    return this.client?.webSocketClient.networkMissing ?? false;
  }

  get connectionErrors(): string[] {
    return this.client?.webSocketClient.errors ?? [];
  }

  connect(): void {
    this.client?.webSocketClient.connect();
  }

  disconnect(): void {
    this.client?.webSocketClient.disconnect();
  }

  setDarkMode(darkMode: boolean): void {
    log.debug('Update editor dark mode', darkMode);
    this.dispatch({
      effects: [
        StateEffect.appendConfig.of([EditorView.darkTheme.of(darkMode)]),
      ],
    });
  }

  setEditorParent(editorParent: Element | undefined): void {
    if (this.view !== undefined) {
      this.view.destroy();
    }
    if (editorParent === undefined) {
      this.view = undefined;
      return;
    }
    const view = new EditorView({
      state: this.state,
      parent: editorParent,
      dispatch: (transaction) => {
        this.dispatchTransactionWithoutView(transaction);
        view.update([transaction]);
        if (view.state !== this.state) {
          log.error(
            'Failed to synchronize editor state - store state:',
            this.state,
            'view state:',
            view.state,
          );
        }
      },
    });
    this.view = view;
    this.searchPanel.synchronizeStateToView();
    this.lintPanel.synchronizeStateToView();

    // Reported by Lighthouse 8.3.0.
    const { contentDOM } = view;
    contentDOM.removeAttribute('aria-expanded');
    contentDOM.setAttribute('aria-label', 'Code editor');

    this.scrollToTop();

    log.info('Editor created');
  }

  private scrollToTop() {
    if (this.view === undefined) {
      return;
    }
    const {
      view: { scrollDOM },
    } = this;
    scrollDOM.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  dispatch(...specs: readonly TransactionSpec[]): void {
    const transaction = this.state.update(...specs);
    this.dispatchTransaction(transaction);
  }

  dispatchTransaction(transaction: Transaction): void {
    if (this.view === undefined) {
      this.dispatchTransactionWithoutView(transaction);
    } else {
      this.view.dispatch(transaction);
    }
  }

  private dispatchTransactionWithoutView(tr: Transaction): void {
    log.trace('Editor transaction', tr);
    this.state = tr.state;
    this.client?.onTransaction(tr);
    if (tr.docChanged) {
      this.unsavedChanges = true;
    }
  }

  doCommand(command: Command): boolean {
    if (this.view === undefined) {
      return false;
    }
    return command(this.view);
  }

  doStateCommand(command: StateCommand): boolean {
    return command({
      state: this.state,
      dispatch: (transaction) => this.dispatchTransaction(transaction),
    });
  }

  updateDiagnostics(diagnostics: Diagnostic[]): void {
    this.dispatch(setDiagnostics(this.state, diagnostics));
  }

  get errorCount(): number {
    return countDiagnostics(this.state, 'error');
  }

  get warningCount(): number {
    return countDiagnostics(this.state, 'warning');
  }

  get infoCount(): number {
    return countDiagnostics(this.state, 'info');
  }

  nextDiagnostic(): void {
    this.doCommand(nextDiagnostic);
  }

  updateSemanticHighlighting(
    ranges: IHighlightRange[],
    hexTypeHashes: string[],
  ): void {
    this.dispatch(setSemanticHighlighting(ranges));
    this.hexTypeHashes = hexTypeHashes;
  }

  updateOccurrences(
    write: IOccurrence[],
    read: IOccurrence[],
    goToFirst = false,
    fallbackPos?: number,
  ): void {
    let goTo: number | undefined;
    if (goToFirst) {
      goTo = write[0]?.from ?? read[0]?.from ?? fallbackPos;
    }
    this.dispatch(
      setOccurrences(write, read),
      ...(goTo === undefined
        ? []
        : [
            {
              selection: { anchor: goTo },
              effects: [EditorView.scrollIntoView(goTo)],
            },
          ]),
    );
    if (goTo !== undefined) {
      this.view?.focus();
    }
  }

  async contentAssist(
    context: CompletionContext,
  ): Promise<CompletionResult | null> {
    if (this.client === undefined) {
      return null;
    }
    return this.client.contentAssist(context);
  }

  async hoverTooltip(pos: number): Promise<Tooltip | null> {
    if (this.client === undefined) {
      return null;
    }
    return this.client.hoverTooltip(pos);
  }

  goToDefinition(pos?: number): boolean {
    this.client?.goToDefinition(pos);
    return true;
  }

  /**
   * @returns `true` if there is history to undo
   */
  get canUndo(): boolean {
    return undoDepth(this.state) > 0;
  }

  undo(): void {
    log.debug('Undo', this.doStateCommand(undo));
  }

  /**
   * @returns `true` if there is history to redo
   */
  get canRedo(): boolean {
    return redoDepth(this.state) > 0;
  }

  redo(): void {
    log.debug('Redo', this.doStateCommand(redo));
  }

  setShowLineNumbers(showLineNumbers: boolean): void {
    this.showLineNumbers = showLineNumbers;
    log.debug('Show line numbers', this.showLineNumbers);
  }

  toggleLineNumbers(): void {
    this.setShowLineNumbers(!this.showLineNumbers);
  }

  toggleColorIdentifiers(): void {
    this.colorIdentifiers = !this.colorIdentifiers;
    log.debug('Color identifiers', this.colorIdentifiers);
  }

  get hasSelection(): boolean {
    return this.state.selection.ranges.some(({ from, to }) => from !== to);
  }

  formatText(): boolean {
    if (this.client === undefined) {
      return false;
    }
    this.client.formatText();
    return true;
  }

  analysisStarted() {
    this.analyzing = true;
    this.semanticsUpToDate = false;
  }

  analysisCompleted(semanticAnalysisSkipped = false) {
    this.analyzing = false;
    if (semanticAnalysisSkipped) {
      this.semanticsError = undefined;
      this.propagationRejected = false;
    }
  }

  onDisconnect() {
    this.semanticsUpToDate = false;
    this.analysisCompleted(true);
  }

  setSemanticsError(
    semanticsError: string | undefined,
    propagationRejected: boolean,
  ) {
    this.semanticsError = semanticsError;
    this.propagationRejected = propagationRejected;
  }

  setSemantics(semantics: SemanticsModelResult) {
    this.semanticsUpToDate = true;
    this.graph.setSemantics(semantics);
  }

  dispose(): void {
    this.eclipseConnector?.dispose();
    this.client?.dispose();
    this.delayedErrors.dispose();
    this.disposed = true;
  }

  startModelGeneration(randomSeed?: number): void {
    this.client
      ?.startModelGeneration(randomSeed)
      ?.catch((error) => log.error('Could not start model generation', error));
  }

  addGeneratedModel(uuid: string, randomSeed: number): void {
    this.generatedModels.set(uuid, new GeneratedModelStore(randomSeed, this));
    this.selectGeneratedModel(uuid);
  }

  cancelModelGeneration(): void {
    this.client
      ?.cancelModelGeneration()
      ?.catch((error) => log.error('Could not start model generation', error));
  }

  selectGeneratedModel(uuid: string | undefined): void {
    if (uuid === undefined) {
      this.selectedGeneratedModel = uuid;
      return;
    }
    if (this.generatedModels.has(uuid)) {
      this.selectedGeneratedModel = uuid;
      return;
    }
    this.selectedGeneratedModel = undefined;
  }

  deleteGeneratedModel(uuid: string | undefined): void {
    if (uuid === undefined) {
      return;
    }
    if (this.selectedGeneratedModel === uuid) {
      let previous: string | undefined;
      let found: string | undefined;
      this.generatedModels.forEach((_value, key) => {
        if (key === uuid) {
          found = previous;
        }
        previous = key;
      });
      this.selectGeneratedModel(found);
    }

    const generatedModel = this.generatedModels.get(uuid);
    if (generatedModel?.running) {
      this.cancelModelGeneration();
    }
    this.generatedModels.delete(uuid);
  }

  get selectedGeneratedModelStore(): GeneratedModelStore | undefined {
    if (this.selectedGeneratedModel === undefined) {
      return undefined;
    }
    return this.generatedModels.get(this.selectedGeneratedModel);
  }

  get selectedGraph(): GraphStore {
    return this.selectedGeneratedModelStore?.graph ?? this.graph;
  }

  modelGenerationCancelled(): void {
    this.generatedModels.forEach((value) =>
      value.setError('Model generation cancelled'),
    );
  }

  setGeneratedModelMessage(uuid: string, message: string): void {
    this.generatedModels.get(uuid)?.setMessage(message);
  }

  setGeneratedModelError(uuid: string, message: string): void {
    this.generatedModels.get(uuid)?.setError(message);
  }

  setGeneratedModelSemantics(
    uuid: string,
    semantics: SemanticsModelResult,
  ): void {
    this.generatedModels.get(uuid)?.setSemantics(semantics);
  }

  get generating(): boolean {
    let generating = false;
    this.generatedModels.forEach((value) => {
      generating = generating || value.running;
    });
    return generating;
  }

  openFile(): boolean {
    openTextFile(FILE_PICKER_OPTIONS)
      .then((result) => this.fileOpened(result))
      .catch((error) => log.error('Failed to open file', error));
    return true;
  }

  clearUnsavedChanges(): void {
    this.unsavedChanges = false;
  }

  updateContents(newContents: string): void {
    if (this.state.sliceDoc() === newContents) {
      return;
    }
    this.dispatch({
      changes: [
        {
          from: 0,
          to: this.state.doc.length,
          insert: newContents,
        },
      ],
      annotations: [isolateHistory.of('full')],
    });
    this.clearUnsavedChanges();
  }

  private setFile({ name, handle }: OpenResult): void {
    log.info('Opened file', name);
    this.fileName = name;
    this.fileHandle = handle;
  }

  private fileOpened(result: OpenTextFileResult): void {
    this.dispatch({
      changes: [
        {
          from: 0,
          to: this.state.doc.length,
          insert: result.text,
        },
      ],
      effects: [historyCompartment.reconfigure([])],
    });
    this.scrollToTop();
    // Clear history by removing and re-adding the history extension. See
    // https://stackoverflow.com/a/77943295 and
    // https://discuss.codemirror.net/t/codemirror-6-cm-clearhistory-equivalent/2851/10
    this.dispatch({
      effects: [historyCompartment.reconfigure([createHistoryExtension()])],
    });
    this.setFile(result);
    this.clearUnsavedChanges();
  }

  saveFile(): boolean {
    if (!this.unsavedChanges) {
      return false;
    }
    if (this.eclipseConnector !== undefined) {
      this.eclipseConnector.save();
      return true;
    }
    if (this.fileHandle === undefined) {
      return this.saveFileAs();
    }
    saveTextFile(this.fileHandle, this.state.sliceDoc())
      .then(() => this.clearUnsavedChanges())
      .catch((error) => log.error('Failed to save file', error));
    return true;
  }

  saveFileAs(): boolean {
    if (this.eclipseConnector !== undefined) {
      this.eclipseConnector.saveAs();
      return true;
    }
    const blob = new Blob([this.state.sliceDoc()], {
      type: REFINERY_CONTENT_TYPE,
    });
    saveBlob(blob, this.fileName ?? 'graph.problem', FILE_PICKER_OPTIONS)
      .then((result) => this.fileSavedAs(result))
      .catch((error) => log.error('Failed to save file', error));
    return true;
  }

  private fileSavedAs(result: OpenResult | undefined) {
    if (result !== undefined) {
      this.setFile(result);
    }
    this.clearUnsavedChanges();
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

  toggleConcretize(): void {
    this.concretize = !this.concretize;
    this.client?.updateConcretize();
  }

  setSelectedSymbolName(selectedSymbolName: string | undefined): void {
    this.selectedSymbolName = selectedSymbolName;
  }

  toggleShowComputed(): void {
    this.showComputed = !this.showComputed;
  }
}
