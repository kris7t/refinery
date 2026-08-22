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
import type EditorStore from './editor/EditorStore';
import ExportSettingsStore from './graph/export/ExportSettingsStore';
import Compressor from './persistence/Compressor';
import defaultInitialValue from './persistence/initialValue';
import ThemeStore from './theme/ThemeStore';
import fetchBackendConfig, {
  type BackendConfigWithDefaults,
} from './xtext/fetchBackendConfig';

const log = getLogger('RootStore');

export default class RootStore {
  private readonly compressor = new Compressor(this.setInitialValue.bind(this));

  private initialValue: string | undefined;

  private initialVisibility: Record<string, Visibility> | undefined;

  private initialFileName: string | undefined;

  private editorStoreClass: typeof EditorStore | undefined;

  backendConfig: BackendConfigWithDefaults | undefined;

  editorStore: EditorStore | undefined;

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
        .then((result) => {
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
          this.setInitialValue(defaultInitialValue, undefined, undefined);
        });
    } else {
      this.compressor.decompressInitial();
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
      this.editorStoreClass !== undefined
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
      );
      this.editorStore = editorStore;
      this.titleReaction?.();
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
