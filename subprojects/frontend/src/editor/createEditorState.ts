/*
 * SPDX-FileCopyrightText: 2021-2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {
  acceptCompletion,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import {
  copyLineDown,
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import {
  bracketMatching,
  codeFolding,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintKeymap, lintGutter } from '@codemirror/lint';
import { search, searchKeymap, selectNextOccurrence } from '@codemirror/search';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  hoverTooltip,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { classHighlighter } from '@lezer/highlight';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';

import problemLanguageSupport from '../language/problemLanguageSupport';

import type EditorStore from './EditorStore';
import SearchPanel from './SearchPanel';
import bidiIsolatesExtension from './bidiIsolatesExtension';
import crosshairCursor from './crosshairCursor';
import exposeDiagnostics from './exposeDiagnostics';
import findOccurrences from './findOccurrences';
import goToDefinition from './goToDefinition';
import scrollbarsExtension from './scrollbarsExtension';
import semanticHighlighting from './semanticHighlighting';

export const historyCompartment = new Compartment();

export function createHistoryExtension(): Extension {
  return history();
}

export default function createEditorState(
  initialValue: string,
  insideIDE: boolean,
  store: EditorStore,
): EditorState {
  return EditorState.create({
    doc: initialValue,
    extensions: [
      autocompletion({
        activateOnTyping: true,
        override: [(context) => store.contentAssist(context)],
      }),
      hoverTooltip((_editorView, pos) => store.hoverTooltip(pos)),
      closeBrackets(),
      bidiIsolatesExtension(),
      bracketMatching(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      // See https://discuss.codemirror.net/t/adding-multiple-selections-with-alt-click-instead-of-ctrl-click/5034
      EditorView.clickAddsSelectionRange.of((e) => e.altKey && !e.shiftKey),
      exposeDiagnostics,
      findOccurrences,
      goToDefinition(store),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      historyCompartment.of([createHistoryExtension()]),
      indentOnInput(),
      indentationMarkers({
        markerType: 'codeOnly',
      }),
      rectangularSelection({
        eventFilter: (e) => e.altKey && e.shiftKey,
      }),
      crosshairCursor(),
      search({
        createPanel(view) {
          return new SearchPanel(view, store.searchPanel);
        },
      }),
      syntaxHighlighting(classHighlighter),
      semanticHighlighting,
      // We add the gutters to `extensions` in the order we want them to appear.
      lintGutter(),
      lineNumbers(),
      codeFolding({
        placeholderDOM(_view, onClick) {
          const button = document.createElement('button');
          button.className = 'problem-editor-foldPlaceholder';
          button.ariaLabel = 'Unfold lines';
          const span = document.createElement('span');
          span.innerText = '...';
          button.appendChild(span);
          button.addEventListener('click', onClick);
          return button;
        },
      }),
      foldGutter({
        markerDOM(open) {
          const div = document.createElement('div');
          div.className = [
            'problem-editor-foldMarker',
            `problem-editor-foldMarker-${open ? 'open' : 'closed'}`,
          ].join(' ');
          return div;
        },
      }),
      // Place this extension after the gutter, because it has to listen to gutter size changes.
      scrollbarsExtension(),
      keymap.of([
        { key: 'Mod-Shift-f', run: () => store.formatText() },
        ...(insideIDE
          ? [
              'Mod-o',
              'Mod-s',
              'Mod-z',
              'Mod-y',
              'Mod-Shift-z',
              'Ctrl-Shift-z',
            ].map((key) => ({
              key,
              // Inside Eclipse, these keybinds are handled by the command framework.
              run: () => true,
              preventDefault: true,
            }))
          : [
              { key: 'Mod-o', run: () => store.openFile() },
              {
                key: 'Mod-s',
                run: () => store.saveFile(),
                shift: () => store.saveFileAs(),
                preventDefault: true,
              },
            ]),
        ...closeBracketsKeymap,
        ...completionKeymap,
        ...foldKeymap,
        ...historyKeymap,
        {
          key: 'F3',
          run: () => store.goToDefinition(),
        },
        // Enable accepting completions with tab, overrides `Tab` from
        // `indentWithTab` if there is an active completion.
        { key: 'Tab', run: acceptCompletion },
        indentWithTab,
        // Override keys in `lintKeymap` to go through the `EditorStore`.
        { key: 'Mod-Shift-m', run: () => store.lintPanel.open() },
        ...lintKeymap,
        // Override keys in `searchKeymap` to go through the `EditorStore`.
        {
          key: 'Mod-f',
          // Inside Eclipse, `Mod-f` is handled by the command framework.
          run: () => (insideIDE ? true : store.searchPanel.open()),
          scope: 'editor search-panel',
        },
        {
          key: 'Escape',
          run: () => store.searchPanel.close(),
          scope: 'editor search-panel',
        },
        // Override `Mod-d` from `searchKeymap`.
        {
          key: 'Mod-d',
          run: copyLineDown,
          shift: selectNextOccurrence,
          preventDefault: true,
        },
        ...searchKeymap,
        ...defaultKeymap,
      ]),
      problemLanguageSupport(),
    ],
  });
}
