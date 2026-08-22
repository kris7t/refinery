/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ThemeSource } from '@tools.refinery/frontend/RefineryContextBridge';
import { app } from 'electron';
import { merge } from 'lodash-es';
import {
  type IReactionDisposer,
  makeAutoObservable,
  reaction,
  runInAction,
  toJS,
} from 'mobx';
import ms from 'ms';
import { nanoid } from 'nanoid';
import z from 'zod/v4';

import getLogger from './logger/getLogger';
import { onCleanup } from './utils/cleanup';

/**
 * Contains the settings that need to be accessed from the Electron
 * main process, because they are needed before the SPA fully initializes.
 *
 * Settings used exclusively by the SPA are persisted to `localStorage` instead,
 * so we can use the same code path in both the web and the desktop application,
 * and we avoid having to use an asynchronous IPC round trip to populate them
 * from the main process.
 */
const SettingsSchema = z.object({
  theme: ThemeSource,
});

type SettingsSchema = z.infer<typeof SettingsSchema>;

const log = getLogger('Settings');

const DEBOUNCE_TIME = ms('100ms');

class Settings implements SettingsSchema {
  theme: ThemeSource = 'system';

  private settingsFile: string | undefined;

  private saveToFileDisposer: IReactionDisposer | undefined;

  private timeout: NodeJS.Timeout | undefined;

  constructor() {
    makeAutoObservable<
      typeof this,
      'settingsFile' | 'saveToFileDisposer' | 'timeout'
    >(this, {
      settingsFile: false,
      saveToFileDisposer: false,
      timeout: false,
      readSettings: false,
      close: false,
    });
  }

  async readSettings(): Promise<void> {
    if (this.saveToFileDisposer) {
      throw new Error('Settings file was already loaded');
    }
    this.settingsFile = path.join(app.getPath('userData'), 'settings.json');
    try {
      const contents: unknown = JSON.parse(
        await readFile(this.settingsFile, 'utf-8'),
      );
      const parsed = SettingsSchema.parse(contents);
      runInAction(() => merge(this, parsed));
    } catch (error) {
      if (
        error === null ||
        typeof error !== 'object' ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      ) {
        log.error({ err: error }, 'Failed to parse settings file');
      }
    }
    this.saveToFileDisposer = reaction(
      () => this.toSettingsJSON,
      (contents) => {
        if (this.timeout) {
          clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
          this.saveSettings(contents).catch((error) =>
            log.error({ err: error }, 'Error writing settings file'),
          );
          this.timeout = undefined;
        }, DEBOUNCE_TIME);
      },
      {
        fireImmediately: false,
      },
    );
    onCleanup(() => this.close());
  }

  private async saveSettings(contents: string): Promise<void> {
    if (this.settingsFile === undefined) {
      return;
    }
    const temporaryFile = path.join(
      app.getPath('userData'),
      `settings-${nanoid()}.json`,
    );
    await writeFile(temporaryFile, contents, 'utf-8');
    await rename(temporaryFile, this.settingsFile);
  }

  private get toSettingsJSON(): string {
    return JSON.stringify(
      toJS(this),
      (key, value: unknown) =>
        key === 'settingsFile' ||
        key === 'saveToFileDisposer' ||
        key === 'timeout'
          ? undefined
          : value,
      4,
    );
  }

  setTheme(theme: ThemeSource): void {
    this.theme = theme;
  }

  async close(): Promise<void> {
    if (this.saveToFileDisposer) {
      this.saveToFileDisposer();
      this.saveToFileDisposer = undefined;
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
      await this.saveSettings(this.toSettingsJSON);
    }
  }
}

/**
 * Singleton instance of the `Settings` store.
 */
const settings = new Settings();

export default settings;
