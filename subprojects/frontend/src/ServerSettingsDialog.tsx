/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { styled, useTheme } from '@mui/material/styles';
import { type DragEvent, useEffect, useId, useRef, useState } from 'react';

import Dialog from './Dialog';
import DialogActionBar from './DialogActionBar';
import LogarithmicSlider from './LogarithmicSlider';
import RefineryContextBridge, {
  LibraryDirectoryResult as LibraryDirectoryResultSchema,
  RestartServerResult,
  ServerSettingsResponse as ServerSettingsResponseSchema,
  type ServerSettings,
} from './RefineryContextBridge';
import { useRootStore } from './RootStoreProvider';
import {
  MAX_SEMANTICS_TIMEOUT_MS,
  MIN_MODEL_GENERATION_TIMEOUT_SEC,
  MIN_SEMANTICS_TIMEOUT_MS,
  UNLIMITED_MODEL_GENERATION_TIMEOUT_SEC,
} from './serverLimits';
import {
  GIBIBYTE,
  JVM_COMPRESSED_OOPS_THRESHOLD_BYTES,
  MEBIBYTE,
  MIN_MAX_MEMORY_BYTES,
} from './serverMemory';
import getLogger from './utils/getLogger';

const log = getLogger('ServerSettingsDialog');

// A newer restart supersedes older results, so a late menu failure cannot
// cover a settings dialog that is already restarting the server.
let latestRestartGeneration = 0;

function beginRestart(): number {
  latestRestartGeneration += 1;
  return latestRestartGeneration;
}

function isCurrentRestart(generation: number): boolean {
  return generation === latestRestartGeneration;
}

export function restartBackendServer(
  refinery: RefineryContextBridge,
  settings?: ServerSettings,
): Promise<RestartServerResult> {
  return refinery
    .restartServer(settings)
    .then((rawResult) => RestartServerResult.parse(rawResult));
}

export function RestartServerMenuItem({
  onClose,
}: {
  onClose: () => void;
}): React.ReactElement {
  const rootStore = useRootStore();

  return (
    <MenuItem
      onClick={() => {
        onClose();
        const refinery = window.refinery;
        if (refinery === undefined) {
          return;
        }
        const generation = beginRestart();
        const showRestartError = () => {
          rootStore.showError(
            'Failed to restart solver',
            'The solver could not be restarted.',
          );
        };
        restartBackendServer(refinery)
          .then((success) => {
            if (!success && isCurrentRestart(generation)) {
              showRestartError();
            }
          })
          .catch((error: unknown) => {
            log.error({ err: error }, 'Failed to restart server');
            if (isCurrentRestart(generation)) {
              showRestartError();
            }
          });
      }}
      sx={{ color: 'error.main' }}
    >
      Restart solver
    </MenuItem>
  );
}

const SEMANTICS_TIMEOUT_MARKS = [
  { value: MIN_SEMANTICS_TIMEOUT_MS, label: '1 s' },
  { value: 2_000, label: '2 s' },
  { value: 5_000, label: '5 s' },
  { value: 10_000, label: '10 s' },
  { value: 30_000, label: '30 s' },
  { value: MAX_SEMANTICS_TIMEOUT_MS, label: '60 s' },
] as const;

const MEMORY_MARK_MIN_DISTANCE = 180;

function formatMemory(valueBytes: number): string {
  if (valueBytes < GIBIBYTE) {
    return `${Math.round(valueBytes / MEBIBYTE)} MiB`;
  }
  const gibibytes = valueBytes / GIBIBYTE;
  return `${Number(gibibytes.toFixed(1))} GiB`;
}

function getMemoryMarks(
  maximum: number,
  defaultMemory: number,
): readonly {
  value: number;
  label: React.ReactNode;
}[] {
  const candidates = new Map<number, { label: string; priority: number }>();
  const addCandidate = (value: number, label: string, priority: number) => {
    if (value < MIN_MAX_MEMORY_BYTES || value > maximum) {
      return;
    }
    const previous = candidates.get(value);
    if (previous === undefined || priority > previous.priority) {
      candidates.set(value, { label, priority });
    }
  };

  addCandidate(MIN_MAX_MEMORY_BYTES, formatMemory(MIN_MAX_MEMORY_BYTES), 1200);
  for (let value = 256 * MEBIBYTE; value < maximum; value *= 2) {
    addCandidate(value, formatMemory(value), 100);
  }
  addCandidate(defaultMemory, formatMemory(defaultMemory), 950);
  addCandidate(
    JVM_COMPRESSED_OOPS_THRESHOLD_BYTES,
    formatMemory(JVM_COMPRESSED_OOPS_THRESHOLD_BYTES),
    900,
  );
  const seventyFivePercent = Math.round((maximum * 0.75) / MEBIBYTE) * MEBIBYTE;
  addCandidate(seventyFivePercent, formatMemory(seventyFivePercent), 850);
  addCandidate(maximum, formatMemory(maximum), 1100);

  const position = (value: number) =>
    Math.log(value / MIN_MAX_MEMORY_BYTES) /
    Math.log(maximum / MIN_MAX_MEMORY_BYTES);
  const labeledValues = new Set<number>();
  for (const [value] of [...candidates.entries()].sort(
    ([, left], [, right]) => right.priority - left.priority,
  )) {
    if (
      [...labeledValues].every(
        (other) =>
          Math.abs(position(value) - position(other)) * 1_000 >=
          MEMORY_MARK_MIN_DISTANCE,
      )
    ) {
      labeledValues.add(value);
    }
  }
  return [...candidates.entries()]
    .sort(([left], [right]) => left - right)
    .map(([value, { label }]) => ({
      value,
      label: labeledValues.has(value) ? label : undefined,
    }));
}

function getMemoryStatus(
  valueBytes: number,
  systemMemoryBytes: number,
): {
  readonly color: 'warning' | 'error' | undefined;
  readonly description: string;
} {
  if (valueBytes > systemMemoryBytes * 0.75) {
    return {
      color: 'error',
      description: 'May reduce system performance by causing swapping.',
    };
  }
  if (valueBytes > JVM_COMPRESSED_OOPS_THRESHOLD_BYTES) {
    return {
      color: 'warning',
      description:
        'May reduce solver performance because JVM references become wider.',
    };
  }
  return {
    color: undefined,
    description: 'Within the recommended memory range.',
  };
}

function describeMemoryValue(
  valueBytes: number,
  systemMemoryBytes: number,
): string {
  const value = formatMemory(valueBytes);
  const { color, description } = getMemoryStatus(valueBytes, systemMemoryBytes);
  return color === undefined ? value : `${value}, ${description}`;
}

const MODEL_GENERATION_TIMEOUT_MAX_SEC = 14_400;
const MODEL_GENERATION_TIMEOUT_MARKS = [
  { value: MIN_MODEL_GENERATION_TIMEOUT_SEC, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 1_800, label: '30 min' },
  { value: 3_600, label: '1 h' },
  { value: 7_200, label: '2 h' },
  { value: MODEL_GENERATION_TIMEOUT_MAX_SEC, label: '4 h' },
  {
    value: UNLIMITED_MODEL_GENERATION_TIMEOUT_SEC,
    label: (
      <abbr title="Unlimited" style={{ textDecoration: 'none' }}>
        Unlim.
      </abbr>
    ),
  },
] as const;

function formatSemanticsTimeout(valueMs: number): string {
  const seconds = valueMs / 1_000;
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} s`;
}

function formatGenerationTimeout(valueSec: number): string {
  if (valueSec >= UNLIMITED_MODEL_GENERATION_TIMEOUT_SEC) {
    return 'Unlimited';
  }
  const minutes = Math.round(valueSec / 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0
      ? `${hours} h`
      : `${hours} h ${remainingMinutes} min`;
  }
  return `${minutes} min`;
}

function haveSettingsChanged(
  draft: ServerSettings | undefined,
  initialSettings: ServerSettings | undefined,
): boolean {
  return (
    draft !== undefined &&
    initialSettings !== undefined &&
    (draft.semanticsTimeoutMs !== initialSettings.semanticsTimeoutMs ||
      draft.modelGenerationTimeoutSec !==
        initialSettings.modelGenerationTimeoutSec ||
      draft.maxMemoryBytes !== initialSettings.maxMemoryBytes ||
      draft.libraryPaths.length !== initialSettings.libraryPaths.length ||
      draft.libraryPaths.some(
        (libraryPath, index) =>
          libraryPath !== initialSettings.libraryPaths[index],
      ))
  );
}

export type ServerSettingsTab = 'solver' | 'libraries';

const ServerSettingsTitleBar = styled('div', {
  name: 'ServerSettingsTitleBar',
})(({ theme }) => ({
  alignItems: 'center',
  appRegion: 'drag',
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  minHeight: '57px',
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(1),
  '.MuiTabs-root': {
    alignSelf: 'stretch',
    flexGrow: 1,
    flexShrink: 0,
  },
  '.MuiTabs-list': {
    minHeight: '100%',
  },
  '.MuiTab-root': {
    minHeight: '100%',
    minWidth: 0,
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    appRegion: 'no-drag',
  },
  '.MuiIconButton-root': {
    flexGrow: 0,
    flexShrink: 0,
    marginLeft: theme.spacing(2),
  },
}));

export default function ServerSettingsDialog({
  open,
  onClose,
  onTabChange,
  tab,
}: {
  open: boolean;
  onClose: () => void;
  onTabChange: (tab: ServerSettingsTab) => void;
  tab: ServerSettingsTab;
}): React.ReactElement {
  const id = useId();
  const theme = useTheme();
  const semanticsTimeoutLabelId = `${id}-semantics-timeout-label`;
  const generationTimeoutLabelId = `${id}-generation-timeout-label`;
  const maxMemoryLabelId = `${id}-max-memory-label`;
  const [draft, setDraft] = useState<ServerSettings>();
  const [initialSettings, setInitialSettings] = useState<ServerSettings>();
  const [draggedLibraryIndex, setDraggedLibraryIndex] = useState<number>();
  const [dragTargetLibraryIndex, setDragTargetLibraryIndex] =
    useState<number>();
  const [externalLibraryDragOver, setExternalLibraryDragOver] = useState(false);
  const [systemMemoryBytes, setSystemMemoryBytes] = useState<number>();
  const [defaultMaxMemoryBytes, setDefaultMaxMemoryBytes] = useState<number>();
  const [pathDelimiter, setPathDelimiter] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const libraryMoveButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  const reset = () => {
    setDraft(undefined);
    setInitialSettings(undefined);
    setDraggedLibraryIndex(undefined);
    setDragTargetLibraryIndex(undefined);
    setExternalLibraryDragOver(false);
    setSystemMemoryBytes(undefined);
    setDefaultMaxMemoryBytes(undefined);
    setPathDelimiter(undefined);
    setError(undefined);
    setLoading(true);
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const refinery = window.refinery;
    let disposed = false;
    if (refinery === undefined) {
      return undefined;
    }
    (async () => {
      try {
        const rawSettings = await refinery.getServerSettings();
        const {
          settings: serverSettings,
          systemMemoryBytes: availableSystemMemoryBytes,
          defaultMaxMemoryBytes: availableDefaultMaxMemoryBytes,
          pathDelimiter: availablePathDelimiter,
        } = ServerSettingsResponseSchema.parse(rawSettings);
        if (!disposed) {
          setDraft(serverSettings);
          setInitialSettings(serverSettings);
          setSystemMemoryBytes(availableSystemMemoryBytes);
          setDefaultMaxMemoryBytes(availableDefaultMaxMemoryBytes);
          setPathDelimiter(availablePathDelimiter);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    })().catch((err: unknown) => {
      log.error({ err }, 'Failed to load settings');
      if (!disposed) {
        setError('Failed to load settings.');
      }
    });
    return () => {
      disposed = true;
    };
  }, [open]);

  const close = () => {
    if (pending) {
      return;
    }
    onClose();
  };

  const restartFailed = () => {
    setPending(false);
    setError('Failed to restart the solver.');
  };

  const apply = () => {
    if (draft === undefined || initialSettings === undefined || pending) {
      return;
    }
    const refinery = window.refinery;
    if (refinery === undefined) {
      return;
    }
    const settingsChanged = haveSettingsChanged(draft, initialSettings);
    beginRestart();
    (async () => {
      setError(undefined);
      setPending(true);
      try {
        const success = await restartBackendServer(
          refinery,
          settingsChanged ? draft : undefined,
        );
        if (success) {
          close();
        } else {
          restartFailed();
        }
      } finally {
        setPending(false);
      }
    })().catch((err: unknown) => {
      log.error({ err }, 'Failed to restart solver');
      restartFailed();
    });
  };

  const updateSemanticsTimeout = (semanticsTimeoutMs: number) => {
    if (draft === undefined) {
      return;
    }
    setDraft({
      ...draft,
      semanticsTimeoutMs,
    });
  };

  const updateGenerationTimeout = (modelGenerationTimeoutSec: number) => {
    if (draft === undefined) {
      return;
    }
    setDraft({
      ...draft,
      modelGenerationTimeoutSec,
    });
  };

  const updateMaxMemory = (maxMemoryBytes: number) => {
    if (draft === undefined) {
      return;
    }
    setDraft({
      ...draft,
      maxMemoryBytes,
    });
  };

  const addLibraryPaths = (libraryPaths: readonly string[]) => {
    setError(undefined);
    if (libraryPaths.length === 0) {
      return;
    }
    const acceptedLibraryPaths: string[] = [];
    let rejectedLibraryPath: string | undefined;
    let duplicateLibraryPath: string | undefined;
    const existingLibraryPaths = draft?.libraryPaths ?? [];
    for (const libraryPath of libraryPaths) {
      if (pathDelimiter !== undefined && libraryPath.includes(pathDelimiter)) {
        rejectedLibraryPath ??= libraryPath;
      } else if (
        existingLibraryPaths.includes(libraryPath) ||
        acceptedLibraryPaths.includes(libraryPath)
      ) {
        duplicateLibraryPath ??= libraryPath;
      } else {
        acceptedLibraryPaths.push(libraryPath);
      }
    }
    if (rejectedLibraryPath !== undefined && pathDelimiter !== undefined) {
      setError(
        `The library directory "${rejectedLibraryPath}" cannot be added because its path contains "${pathDelimiter}", the library path separator.`,
      );
    } else if (duplicateLibraryPath !== undefined) {
      setError(
        `The library directory "${duplicateLibraryPath}" is already in the list.`,
      );
    }
    if (acceptedLibraryPaths.length === 0) {
      return;
    }
    setDraft((currentDraft) => {
      if (currentDraft === undefined) {
        return currentDraft;
      }
      const newLibraryPaths = [...currentDraft.libraryPaths];
      for (const libraryPath of acceptedLibraryPaths) {
        if (!newLibraryPaths.includes(libraryPath)) {
          newLibraryPaths.push(libraryPath);
        }
      }
      return { ...currentDraft, libraryPaths: newLibraryPaths };
    });
  };

  const selectLibraryDirectory = () => {
    const refinery = window.refinery;
    if (refinery === undefined) {
      return;
    }
    const reportFailure = () => setError('Failed to select library directory.');
    (async () => {
      const rawLibraryPath = await refinery.selectLibraryDirectory();
      const libraryPath = LibraryDirectoryResultSchema.parse(rawLibraryPath);
      if (libraryPath === undefined) {
        return;
      }
      if (typeof libraryPath === 'string') {
        addLibraryPaths([libraryPath]);
      } else {
        reportFailure();
      }
    })().catch((err: unknown) => {
      log.error({ err }, 'Failed to select library directory');
      reportFailure();
    });
  };

  const removeLibraryPath = (libraryPath: string) => {
    setDraft((currentDraft) =>
      currentDraft === undefined
        ? currentDraft
        : {
            ...currentDraft,
            libraryPaths: currentDraft.libraryPaths.filter(
              (path) => path !== libraryPath,
            ),
          },
    );
  };

  const moveLibraryPath = (from: number, to: number) => {
    setDraft((currentDraft) => {
      if (
        currentDraft === undefined ||
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= currentDraft.libraryPaths.length ||
        to >= currentDraft.libraryPaths.length
      ) {
        return currentDraft;
      }
      const libraryPaths = [...currentDraft.libraryPaths];
      const libraryPath = libraryPaths.splice(from, 1)[0];
      if (libraryPath === undefined) {
        return currentDraft;
      }
      libraryPaths.splice(to, 0, libraryPath);
      return { ...currentDraft, libraryPaths };
    });
  };

  const moveLibraryPathWithFocus = (
    from: number,
    to: number,
    direction: 'up' | 'down',
  ) => {
    const libraryPath = draft?.libraryPaths[from];
    if (libraryPath === undefined) {
      return;
    }
    moveLibraryPath(from, to);
    const focusDirection =
      (direction === 'up' && to === 0) ||
      (direction === 'down' && to === (draft?.libraryPaths.length ?? 0) - 1)
        ? direction === 'up'
          ? 'down'
          : 'up'
        : direction;
    requestAnimationFrame(() => {
      libraryMoveButtonRefs.current
        .get(`${focusDirection}:${libraryPath}`)
        ?.focus();
    });
  };

  const dismiss = pending ? undefined : close;
  const settingsChanged = haveSettingsChanged(draft, initialSettings);
  const handleLibraryDrop = (event: DragEvent<HTMLElement>, index?: number) => {
    if (pending) {
      event.preventDefault();
      event.stopPropagation();
      setDragTargetLibraryIndex(undefined);
      setExternalLibraryDragOver(false);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (draggedLibraryIndex !== undefined && index !== undefined) {
      moveLibraryPath(draggedLibraryIndex, index);
    } else {
      const refinery = window.refinery;
      if (refinery !== undefined) {
        const fileItems = Array.from(event.dataTransfer.items).filter(
          (item) => item.kind === 'file',
        );
        const directoryItems = fileItems.filter(
          (item) => item.webkitGetAsEntry()?.isDirectory === true,
        );
        const libraryPaths = directoryItems
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null)
          .map((file) => {
            try {
              return refinery.getPathForFile(file);
            } catch (error) {
              log.error({ err: error }, 'Failed to get dropped file path');
              return undefined;
            }
          })
          .filter(
            (filePath): filePath is string =>
              filePath !== undefined && filePath !== '',
          );
        addLibraryPaths(libraryPaths);
        if (fileItems.length > 0 && directoryItems.length === 0) {
          setError('Only directories can be added to the library list.');
        }
      }
    }
    setDraggedLibraryIndex(undefined);
    setDragTargetLibraryIndex(undefined);
    setExternalLibraryDragOver(false);
  };
  const maximumMemory =
    systemMemoryBytes === undefined
      ? undefined
      : Math.max(
          Math.floor(systemMemoryBytes / MEBIBYTE) * MEBIBYTE,
          MIN_MAX_MEMORY_BYTES,
        );
  const memoryStatus =
    draft === undefined || systemMemoryBytes === undefined
      ? undefined
      : getMemoryStatus(draft.maxMemoryBytes, systemMemoryBytes);
  const memoryCaptionColor =
    memoryStatus?.color === undefined
      ? theme.palette.text.secondary
      : theme.palette[memoryStatus.color][
          theme.palette.mode === 'dark' ? 'main' : 'dark'
        ];

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      maxWidth="sm"
      fullWidth
      disableRestoreFocus
      slotProps={{
        transition: {
          onExited: reset,
        },
      }}
    >
      <ServerSettingsTitleBar>
        <Tabs
          value={tab}
          onChange={(_event, value: ServerSettingsTab) => {
            setError(undefined);
            onTabChange(value);
          }}
          aria-label="Settings"
        >
          <Tab value="solver" label="Solver options" disabled={pending} />
          <Tab value="libraries" label="Libraries" disabled={pending} />
        </Tabs>
        <IconButton
          aria-label="Close"
          disabled={pending}
          onClick={close}
          sx={{ appRegion: 'no-drag' }}
        >
          <CloseIcon />
        </IconButton>
      </ServerSettingsTitleBar>
      <Box sx={{ minWidth: 0, p: 2 }}>
        {error !== undefined && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <CircularProgress size={24} />
            <span>Loading settings</span>
          </Stack>
        ) : (
          draft !== undefined &&
          (tab === 'libraries' ? (
            <Stack spacing={2}>
              <Typography>
                Directories containing modules available through the{' '}
                <code>import</code> mechanism.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                onClick={selectLibraryDirectory}
                disabled={pending}
              >
                Add directory
              </Button>
              <Box
                onDragOver={(event) => {
                  event.preventDefault();
                  if (
                    draggedLibraryIndex === undefined &&
                    Array.from(event.dataTransfer.items).some(
                      (item) => item.kind === 'file',
                    )
                  ) {
                    setExternalLibraryDragOver(true);
                  }
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  ) {
                    setExternalLibraryDragOver(false);
                  }
                }}
                onDrop={handleLibraryDrop}
                sx={{
                  border: '1px dashed',
                  borderColor: externalLibraryDragOver
                    ? 'primary.main'
                    : 'divider',
                  borderRadius: 1,
                  bgcolor: externalLibraryDragOver ? 'action.hover' : undefined,
                  minHeight: 96,
                  p: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent:
                    draft.libraryPaths.length === 0 ? 'center' : 'flex-start',
                }}
              >
                {draft.libraryPaths.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ p: 2, textAlign: 'center' }}
                  >
                    Drag directories here to add them.
                  </Typography>
                ) : (
                  <Stack
                    spacing={0.5}
                    role="list"
                    sx={{ maxHeight: 240, overflowY: 'auto', pr: 0.5 }}
                  >
                    {draft.libraryPaths.map((libraryPath, index) => (
                      <Box
                        key={libraryPath}
                        draggable={!pending}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', libraryPath);
                          setDraggedLibraryIndex(index);
                          setDragTargetLibraryIndex(undefined);
                          setExternalLibraryDragOver(false);
                        }}
                        onDragEnd={() => {
                          setDraggedLibraryIndex(undefined);
                          setDragTargetLibraryIndex(undefined);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (
                            draggedLibraryIndex !== undefined &&
                            draggedLibraryIndex !== index
                          ) {
                            setDragTargetLibraryIndex((currentIndex) =>
                              currentIndex === index ? currentIndex : index,
                            );
                          }
                        }}
                        onDrop={(event) => handleLibraryDrop(event, index)}
                        role="listitem"
                        sx={{
                          alignItems: 'center',
                          borderRadius: 1,
                          display: 'flex',
                          gap: 0.5,
                          minWidth: 0,
                          px: 0.5,
                          '&:hover': { bgcolor: 'action.hover' },
                          ...(dragTargetLibraryIndex === index
                            ? {
                                bgcolor: 'action.selected',
                                outline: `2px solid ${theme.palette.primary.main}`,
                                outlineOffset: '-2px',
                              }
                            : {}),
                        }}
                      >
                        <DragIndicatorIcon
                          fontSize="small"
                          color="disabled"
                          aria-hidden="true"
                        />
                        <Typography
                          noWrap
                          title={libraryPath}
                          sx={{ flex: 1, minWidth: 0 }}
                        >
                          {libraryPath}
                        </Typography>
                        <IconButton
                          aria-label={`Move ${libraryPath} up`}
                          onClick={() =>
                            moveLibraryPathWithFocus(index, index - 1, 'up')
                          }
                          disabled={pending || index === 0}
                          ref={(element) => {
                            const key = `up:${libraryPath}`;
                            if (element === null) {
                              libraryMoveButtonRefs.current.delete(key);
                            } else {
                              libraryMoveButtonRefs.current.set(key, element);
                            }
                          }}
                          size="small"
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label={`Move ${libraryPath} down`}
                          onClick={() =>
                            moveLibraryPathWithFocus(index, index + 1, 'down')
                          }
                          disabled={
                            pending || index === draft.libraryPaths.length - 1
                          }
                          ref={(element) => {
                            const key = `down:${libraryPath}`;
                            if (element === null) {
                              libraryMoveButtonRefs.current.delete(key);
                            } else {
                              libraryMoveButtonRefs.current.set(key, element);
                            }
                          }}
                          size="small"
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label={`Remove ${libraryPath}`}
                          onClick={() => removeLibraryPath(libraryPath)}
                          disabled={pending}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          ) : (
            systemMemoryBytes !== undefined &&
            defaultMaxMemoryBytes !== undefined &&
            maximumMemory !== undefined &&
            memoryStatus !== undefined && (
              <Stack spacing={2}>
                <Box>
                  <Typography id={maxMemoryLabelId} gutterBottom>
                    Maximum memory: {formatMemory(draft.maxMemoryBytes)}
                  </Typography>
                  <Box sx={{ mx: 3 }}>
                    <LogarithmicSlider
                      ariaLabelledby={maxMemoryLabelId}
                      minimum={MIN_MAX_MEMORY_BYTES}
                      maximum={maximumMemory}
                      step={MEBIBYTE}
                      marks={getMemoryMarks(
                        maximumMemory,
                        defaultMaxMemoryBytes,
                      )}
                      value={draft.maxMemoryBytes}
                      formatValue={formatMemory}
                      describeValue={(value) =>
                        describeMemoryValue(value, systemMemoryBytes)
                      }
                      onChange={updateMaxMemory}
                      color={memoryStatus.color}
                      disabled={pending}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: memoryCaptionColor,
                        display: 'block',
                        mt: 0.5,
                      }}
                    >
                      {memoryStatus.description}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography id={semanticsTimeoutLabelId} gutterBottom>
                    Analysis timeout:{' '}
                    {formatSemanticsTimeout(draft.semanticsTimeoutMs)}
                  </Typography>
                  <Box sx={{ mx: 3 }}>
                    <LogarithmicSlider
                      ariaLabelledby={semanticsTimeoutLabelId}
                      minimum={MIN_SEMANTICS_TIMEOUT_MS}
                      maximum={MAX_SEMANTICS_TIMEOUT_MS}
                      step={1_000}
                      marks={SEMANTICS_TIMEOUT_MARKS}
                      value={draft.semanticsTimeoutMs}
                      formatValue={formatSemanticsTimeout}
                      onChange={updateSemanticsTimeout}
                      disabled={pending}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography id={generationTimeoutLabelId} gutterBottom>
                    Generation timeout:{' '}
                    {formatGenerationTimeout(draft.modelGenerationTimeoutSec)}
                  </Typography>
                  <Box sx={{ mx: 3 }}>
                    <LogarithmicSlider
                      ariaLabelledby={generationTimeoutLabelId}
                      minimum={MIN_MODEL_GENERATION_TIMEOUT_SEC}
                      maximum={MODEL_GENERATION_TIMEOUT_MAX_SEC}
                      step={60}
                      unlimitedValue={UNLIMITED_MODEL_GENERATION_TIMEOUT_SEC}
                      marks={MODEL_GENERATION_TIMEOUT_MARKS}
                      value={draft.modelGenerationTimeoutSec}
                      formatValue={formatGenerationTimeout}
                      onChange={updateGenerationTimeout}
                      disabled={pending}
                    />
                  </Box>
                </Box>
              </Stack>
            )
          ))
        )}
      </Box>
      <DialogActionBar>
        <Button
          variant="text"
          onClick={apply}
          disabled={draft === undefined || loading || pending}
          color={pending ? 'inherit' : 'error'}
        >
          {pending
            ? 'Restarting'
            : settingsChanged
              ? 'Apply and restart solver'
              : 'Restart solver'}
        </Button>
      </DialogActionBar>
    </Dialog>
  );
}
