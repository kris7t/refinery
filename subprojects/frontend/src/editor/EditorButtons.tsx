/*
 * SPDX-FileCopyrightText: 2021-2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import type { Diagnostic } from '@codemirror/lint';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckIcon from '@mui/icons-material/Check';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LooksIcon from '@mui/icons-material/Looks';
import RedoIcon from '@mui/icons-material/Redo';
import SaveIcon from '@mui/icons-material/Save';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import SearchIcon from '@mui/icons-material/Search';
import ShortcutIcon from '@mui/icons-material/ShortcutOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import WarningIcon from '@mui/icons-material/Warning';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import MuiTooltip from '@mui/material/Tooltip';
import { observer } from 'mobx-react-lite';

import Tooltip from '../Tooltip';

import ConnectButton from './ConnectButton';
import type EditorStore from './EditorStore';

// Exhastive switch as proven by TypeScript.
// eslint-disable-next-line consistent-return
function getLintIcon(severity: Diagnostic['severity'] | undefined) {
  switch (severity) {
    case 'error':
      return <CancelIcon fontSize="small" />;
    case 'warning':
      return <WarningIcon fontSize="small" />;
    case 'info':
      return <InfoOutlinedIcon fontSize="small" />;
    default:
      return <CheckIcon fontSize="small" />;
  }
}

export default observer(function EditorButtons({
  editorStore,
}: {
  editorStore: EditorStore | undefined;
}): JSX.Element {
  return (
    <Stack
      sx={{
        flexDirection: 'row',
        flexGrow: 1,
      }}
    >
      <Tooltip title="Open">
        <IconButton
          disabled={editorStore === undefined}
          onClick={() => editorStore?.openFile()}
          color="inherit"
        >
          <FileOpenIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Save">
        <IconButton
          disabled={!editorStore?.unsavedChanges}
          onClick={() => editorStore?.saveFile()}
          color="inherit"
        >
          <SaveIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {'showSaveFilePicker' in window && (
        <Tooltip title={`Save as\u2026`}>
          <IconButton
            disabled={editorStore === undefined}
            onClick={() => editorStore?.saveFileAs()}
            color="inherit"
          >
            <SaveAsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Undo">
        <IconButton
          disabled={!editorStore?.canUndo}
          onClick={() => editorStore?.undo()}
          color="inherit"
          sx={{ ml: 1 }}
        >
          <UndoIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Redo">
        <IconButton
          disabled={!editorStore?.canRedo}
          onClick={() => editorStore?.redo()}
          color="inherit"
        >
          <RedoIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <ToggleButtonGroup size="small" className="rounded" sx={{ mx: 1 }}>
        <MuiTooltip title="Line numbers">
          <ToggleButton
            selected={editorStore?.showLineNumbers ?? false}
            disabled={editorStore === undefined}
            onClick={() => editorStore?.toggleLineNumbers()}
            value="show-line-numbers"
          >
            <FormatListNumberedIcon fontSize="small" />
          </ToggleButton>
        </MuiTooltip>
        <MuiTooltip title="Color identifiers">
          <ToggleButton
            selected={editorStore?.colorIdentifiers ?? false}
            disabled={editorStore === undefined}
            onClick={() => editorStore?.toggleColorIdentifiers()}
            value="color-identifiers"
          >
            <LooksIcon fontSize="small" />
          </ToggleButton>
        </MuiTooltip>
        <MuiTooltip title="Find and replace">
          <ToggleButton
            selected={editorStore?.searchPanel?.state ?? false}
            disabled={editorStore === undefined}
            onClick={() => editorStore?.searchPanel?.toggle()}
            {...(editorStore !== undefined &&
              editorStore.searchPanel.state && {
                'aria-controls': editorStore.searchPanel.id,
              })}
            value="show-search-panel"
          >
            <SearchIcon fontSize="small" />
          </ToggleButton>
        </MuiTooltip>
        <MuiTooltip title="Diagnostics panel">
          <ToggleButton
            selected={editorStore?.lintPanel?.state ?? false}
            disabled={editorStore === undefined}
            onClick={() => editorStore?.lintPanel.toggle()}
            {...(editorStore !== undefined &&
              editorStore.lintPanel.state && {
                'aria-controls': editorStore.lintPanel.id,
              })}
            value="show-lint-panel"
          >
            {getLintIcon(editorStore?.delayedErrors?.highestDiagnosticLevel)}
          </ToggleButton>
        </MuiTooltip>
      </ToggleButtonGroup>
      <Tooltip title="Go to definition">
        <IconButton
          disabled={!editorStore?.opened}
          onClick={() => editorStore?.goToDefinition()}
          color="inherit"
        >
          <ShortcutIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Automatic format">
        <IconButton
          disabled={!editorStore?.opened}
          onClick={() => editorStore?.formatText()}
          color="inherit"
        >
          <FormatPaintIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <ConnectButton editorStore={editorStore} />
    </Stack>
  );
});
