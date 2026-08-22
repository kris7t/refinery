/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { Visibility } from '@tools.refinery/client';
import { getLogger } from 'loglevel';
import {
  IReactionDisposer,
  autorun,
  makeAutoObservable,
  runInAction,
} from 'mobx';

import PWAStore from './PWAStore';
import { ReadFileResult } from './RefineryContextBridge';
import type EditorStore from './editor/EditorStore';
import ExportSettingsStore from './graph/export/ExportSettingsStore';
import Compressor, {
  type DecompressFailure,
  type DecompressSource,
} from './persistence/Compressor';
import defaultInitialValue from './persistence/initialValue';
import ThemeStore from './theme/ThemeStore';
import isElectron from './utils/isElectron';
import fetchBackendConfig, {
  type BackendConfigWithDefaults,
} from './xtext/fetchBackendConfig';

const log = getLogger('RootStore');

export default class RootStore {
  private readonly compressor = new Compressor(
    this.setDecompressedValue.bind(this),
    this.decompressionFailed.bind(this),
  );

  private initialValue: string | undefined;

  private initialVisibility: Record<string, Visibility> | undefined;

  private initialFileName: string | undefined;

  private editorStoreClass: typeof EditorStore | undefined;

  backendConfig: BackendConfigWithDefaults | undefined;

  editorStore: EditorStore | undefined;

  errorDialog: { title: string; body: string; fatal: boolean } | undefined =
    undefined;

  readonly pwaStore: PWAStore;

  readonly themeStore: ThemeStore;

  readonly exportSettingsStore: ExportSettingsStore;

  disposed = false;

  private titleReaction: IReactionDisposer | undefined;

  constructor() {
    this.pwaStore = new PWAStore();
    this.themeStore = new ThemeStore();
    this.exportSettingsStore = new ExportSettingsStore();
    makeAutoObservable<
      RootStore,
      'compressor' | 'editorStoreClass' | 'titleReaction'
    >(this, {
      compressor: false,
      editorStoreClass: false,
      pwaStore: false,
      themeStore: false,
      exportSettingsStore: false,
      titleReaction: false,
    });
    (async () => {
      const [backendConfig, { default: EditorStore }] = await Promise.all([
        fetchBackendConfig(),
        import('./editor/EditorStore'),
      ]);
      runInAction(() => {
        if (this.disposed) {
          return;
        }
        this.backendConfig = backendConfig;
        this.editorStoreClass = EditorStore;
        if (this.initialValue !== undefined) {
          this.setInitialValue(
            this.initialValue,
            this.initialVisibility,
            this.initialFileName,
          );
        }
      });
    })().catch((err: unknown) => {
      log.error({ err }, 'Failed to load EditorStore');
    });
    const { refinery } = window;
    if (refinery) {
      refinery
        .readFile()
        .then((result) => ReadFileResult.parse(result))
        .then((result) => {
          if (result !== undefined && 'error' in result) {
            this.initialFileFailed(
              result.name,
              result.reason === 'invalidUtf8',
            );
            return;
          }
          if (result !== undefined && 'hash' in result) {
            this.compressor.decompressInitial(result.hash);
            return;
          }
          this.setInitialValue(
            result?.text ?? defaultInitialValue,
            undefined,
            result?.name,
          );
        })
        .catch((err: unknown) => {
          log.error({ err }, 'Failed to read initial file');
          this.initialFileFailed();
        });
    } else {
      this.compressor.decompressInitial();
    }
  }

  private initialFileFailed(fileName?: string, invalidUtf8 = false) {
    this.showError(
      'Failed to open file',
      invalidUtf8
        ? fileName === undefined
          ? 'The requested file is not valid UTF-8 and could not be opened.'
          : `The requested file “${fileName}” is not valid UTF-8 and could not be opened.`
        : fileName === undefined
          ? 'The requested file could not be opened.'
          : `The requested file “${fileName}” could not be opened.`,
      true,
    );
  }

  private decompressionFailed(
    source: DecompressSource,
    failure: DecompressFailure,
    error: Error,
  ): void {
    log.error({ err: error }, 'Failed to decompress shared state');
    const defaultLoaded = source === 'initial' && !isElectron;
    if (defaultLoaded) {
      this.setDecompressedValue(defaultInitialValue, undefined, source);
    }
    let body: string;
    if (failure === 'workerFailed') {
      body = defaultLoaded
        ? 'Shared-link processing is unavailable. The default model was loaded instead.'
        : 'The shared link could not be opened because shared-link processing is unavailable.';
    } else {
      body = defaultLoaded
        ? 'The shared link is invalid. The default model was loaded instead.'
        : 'The shared link is invalid and could not be opened.';
    }
    this.showError(
      'Failed to open shared link',
      body,
      source === 'initial' && isElectron,
    );
  }

  showError(title: string, body: string, fatal = false): void {
    // Once initialization has failed, later recoverable errors must not expose
    // an application that was never initialized successfully.
    if (this.errorDialog?.fatal) {
      return;
    }
    this.errorDialog = { title, body, fatal };
  }

  closeErrorDialog(): void {
    if (this.errorDialog?.fatal) {
      window.close();
      return;
    }
    this.errorDialog = undefined;
  }

  private setDecompressedValue(
    value: string,
    visibility: Record<string, Visibility> | undefined,
    source: DecompressSource,
  ): void {
    if (this.editorStore === undefined) {
      this.setInitialValue(value, visibility);
    } else if (source === 'openShare') {
      this.editorStore.sharedModelOpened(value, visibility ?? {});
    } else {
      this.editorStore.fileOpened(value, visibility ?? {});
      if (source === 'hashChange') {
        this.editorStore.clearFile();
      }
    }
  }

  setInitialValue(
    initialValue: string,
    visibility: Record<string, Visibility> | undefined,
    fileName?: string,
  ): void {
    runInAction(() => {
      this.initialValue = initialValue;
      this.initialVisibility = visibility;
      this.initialFileName = fileName;
    });
    if (
      this.initialValue !== undefined &&
      this.backendConfig !== undefined &&
      this.editorStoreClass !== undefined &&
      this.editorStore === undefined
    ) {
      const EditorStore = this.editorStoreClass;
      const editorStore = new EditorStore(
        this.initialValue,
        this.initialFileName,
        this.initialVisibility,
        this.pwaStore,
        this.themeStore,
        this.backendConfig,
        this.compressor.compress.bind(this.compressor),
        this.compressor.getShareFragment.bind(this.compressor),
        this.compressor.decompress.bind(this.compressor),
        this.showError.bind(this),
      );
      this.editorStore = editorStore;
      this.titleReaction = autorun(() => {
        const { simpleName, unsavedChanges } = editorStore;
        if (simpleName === undefined) {
          document.title = 'Refinery';
        } else {
          // Chromium web apps don't like whe the file name precedes the app name,
          // and turn `filename - Refinery` into `Refinery - filename - Refinery`.
          // We elect to use just `Refinery - filename` instead.
          // Change indicator in a style similar to VSCodium.
          document.title = `Refinery - ${unsavedChanges ? '\u25cf ' : ''}${simpleName}`;
        }
      });
    }
  }

  get hasChat(): boolean {
    return this.backendConfig?.chatURL !== undefined;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.titleReaction?.();
    this.editorStore?.dispose();
    this.compressor.dispose();
    this.disposed = true;
  }
}
