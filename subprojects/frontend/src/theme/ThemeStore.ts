/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { makeAutoObservable } from 'mobx';

export enum ThemePreference {
  System,
  PreferLight,
  PreferDark,
}

export type SelectedPane = 'code' | 'graph' | 'table' | 'ai';

export default class ThemeStore {
  preference = ThemePreference.System;

  systemDarkMode: boolean;

  showCode = true;

  showGraph = true;

  showTable = false;

  showAI = false;

  constructor() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemDarkMode = mediaQuery.matches;
    mediaQuery.addEventListener('change', (event) => {
      this.systemDarkMode = event.matches;
    });
    makeAutoObservable(this, {
      isShowing: false,
    });
  }

  get darkMode(): boolean {
    switch (this.preference) {
      case ThemePreference.PreferLight:
        return false;
      case ThemePreference.PreferDark:
        return true;
      default:
        return this.systemDarkMode;
    }
  }

  toggleDarkMode(): void {
    if (this.darkMode) {
      this.preference = this.systemDarkMode
        ? ThemePreference.PreferLight
        : ThemePreference.System;
    } else {
      this.preference = this.systemDarkMode
        ? ThemePreference.System
        : ThemePreference.PreferDark;
    }
  }

  togglePane(pane: SelectedPane) {
    switch (pane) {
      case 'code':
        this.toggleCode();
        break;
      case 'graph':
        this.toggleGraph();
        break;
      case 'table':
        this.toggleTable();
        break;
      case 'ai':
        this.toggleAI();
        break;
      default:
        throw new Error(`Unknown pane: ${String(pane)}`);
    }
  }

  isShowing(pane: SelectedPane): boolean {
    switch (pane) {
      case 'code':
        return this.showCode;
      case 'graph':
        return this.showGraph;
      case 'table':
        return this.showTable;
      case 'ai':
        return this.showAI;
      default:
        throw new Error(`Unknown pane: ${String(pane)}`);
    }
  }

  toggleCode(): void {
    if (!this.showGraph && !this.showTable) {
      return;
    }
    this.hideAI();
    this.showCode = !this.showCode;
  }

  toggleGraph(): void {
    if (!this.showCode && !this.showTable) {
      return;
    }
    this.hideAI();
    this.showGraph = !this.showGraph;
  }

  toggleTable(): void {
    if (!this.showCode && !this.showGraph) {
      return;
    }
    this.hideAI();
    this.showTable = !this.showTable;
  }

  toggleAI(): void {
    this.showAI = !this.showAI;
  }

  hideAI(): void {
    this.showAI = false;
  }

  get selectedPane(): SelectedPane {
    if (this.showCode) {
      return 'code';
    }
    if (this.showGraph) {
      return 'graph';
    }
    if (this.showTable) {
      return 'table';
    }
    return 'code';
  }

  setSelectedPane(pane: SelectedPane, keepCode = true): void {
    if (pane === 'ai') {
      // AI pane can never appear on its own.
      this.showAI = true;
      return;
    }
    this.hideAI();
    this.showCode = pane === 'code' || (keepCode && this.showCode);
    this.showGraph = pane === 'graph';
    this.showTable = pane === 'table';
  }
}
