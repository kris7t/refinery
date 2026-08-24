/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useId, useState } from 'react';

import Dialog from './Dialog';
import DialogActionBar from './DialogActionBar';
import DialogTitleBar from './DialogTitleBar';
import LogarithmicSlider from './LogarithmicSlider';
import RefineryContextBridge, {
  RestartServerResult,
  ServerSettings as ServerSettingsSchema,
  type ServerSettings,
} from './RefineryContextBridge';
import { useRootStore } from './RootStoreProvider';
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

const SEMANTICS_TIMEOUT_MIN_MS = 1_000;
const SEMANTICS_TIMEOUT_MAX_MS = 60_000;
const SEMANTICS_TIMEOUT_MARKS = [
  { value: 1_000, label: '1 s' },
  { value: 2_000, label: '2 s' },
  { value: 5_000, label: '5 s' },
  { value: 10_000, label: '10 s' },
  { value: 30_000, label: '30 s' },
  { value: 60_000, label: '60 s' },
] as const;

const UNLIMITED_MODEL_GENERATION_TIMEOUT_SEC = 2_147_483_647;
const MODEL_GENERATION_TIMEOUT_MIN_SEC = 60;
const MODEL_GENERATION_TIMEOUT_MAX_SEC = 14_400;
const MODEL_GENERATION_TIMEOUT_MARKS = [
  { value: 60, label: '1 min' },
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
        initialSettings.modelGenerationTimeoutSec)
  );
}

export default function ServerSettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.ReactElement {
  const id = useId();
  const semanticsTimeoutLabelId = `${id}-semantics-timeout-label`;
  const generationTimeoutLabelId = `${id}-generation-timeout-label`;
  const [draft, setDraft] = useState<ServerSettings>();
  const [initialSettings, setInitialSettings] = useState<ServerSettings>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const reset = () => {
    setDraft(undefined);
    setInitialSettings(undefined);
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
        const serverSettings = ServerSettingsSchema.parse(rawSettings);
        if (!disposed) {
          setDraft(serverSettings);
          setInitialSettings(serverSettings);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    })().catch((err: unknown) => {
      log.error({ err }, 'Failed to load solver options');
      if (!disposed) {
        setError('Failed to load solver options.');
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

  const dismiss = pending ? undefined : close;
  const settingsChanged = haveSettingsChanged(draft, initialSettings);

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
      <DialogTitleBar
        close={close}
        closeDisabled={pending}
        title="Solver options"
      />
      <Box sx={{ minWidth: 0, p: 2 }}>
        {error !== undefined && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <CircularProgress size={24} />
            <span>Loading solver options</span>
          </Stack>
        ) : (
          draft !== undefined && (
            <Stack spacing={2}>
              <Box>
                <Typography id={semanticsTimeoutLabelId} gutterBottom>
                  Analysis timeout:{' '}
                  {formatSemanticsTimeout(draft.semanticsTimeoutMs)}
                </Typography>
                <Box sx={{ mx: 2 }}>
                  <LogarithmicSlider
                    ariaLabelledby={semanticsTimeoutLabelId}
                    minimum={SEMANTICS_TIMEOUT_MIN_MS}
                    maximum={SEMANTICS_TIMEOUT_MAX_MS}
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
                <Box sx={{ mx: 2 }}>
                  <LogarithmicSlider
                    ariaLabelledby={generationTimeoutLabelId}
                    minimum={MODEL_GENERATION_TIMEOUT_MIN_SEC}
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
