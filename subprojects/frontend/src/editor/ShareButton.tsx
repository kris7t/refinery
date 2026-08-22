/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindowsOutlined';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import ShareIcon from '@mui/icons-material/Share';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import visuallyHidden from '@mui/utils/visuallyHidden';
import { type SubmitEvent, useId, useRef, useState } from 'react';

import Dialog from '../Dialog';
import DialogActionBar from '../DialogActionBar';
import DialogTitleBar from '../DialogTitleBar';
import Tooltip from '../Tooltip';
import { parseShareURI } from '../persistence/shareURI';
import getLogger from '../utils/getLogger';
import isElectron from '../utils/isElectron';

import type EditorStore from './EditorStore';

const log = getLogger('editor.ShareButton');

const ELECTRON_SHARE_BASE_URL = 'https://refinery.services';

function createShareURI(fragment: string): string {
  const url = isElectron
    ? new URL(ELECTRON_SHARE_BASE_URL)
    : new URL(window.location.pathname, window.location.origin);
  url.hash = fragment;
  return url.href;
}

function createDesktopURI(fragment: string): string {
  return `refinery://open/${fragment}`;
}

async function readClipboardIfPermitted(): Promise<string | undefined> {
  if (navigator.clipboard === undefined) {
    return undefined;
  }
  const permission = await navigator.permissions.query({
    name: 'clipboard-read' as PermissionName,
  });
  if (permission.state !== 'granted') {
    return undefined;
  }
  return navigator.clipboard.readText();
}

export default function ShareButton({
  editorStore,
}: {
  editorStore: EditorStore | undefined;
}): React.ReactElement {
  const copyStatusID = useId();
  const dialogID = useId();
  const openLinkFormID = useId();
  const requestID = useRef(0);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const openLinkInputRef = useRef<HTMLInputElement>(null);
  const restoreFocusAfterClose = useRef(true);
  const [open, setOpen] = useState(false);
  const [fragment, setFragment] = useState<string>();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [uriToOpen, setURIToOpen] = useState('');

  const close = () => {
    requestID.current += 1;
    setOpen(false);
  };

  const show = () => {
    if (editorStore === undefined) {
      return;
    }
    const currentRequestID = requestID.current + 1;
    requestID.current = currentRequestID;
    setFragment(undefined);
    setError(undefined);
    setCopied(false);
    setURIToOpen('');
    restoreFocusAfterClose.current = true;
    setOpen(true);
    readClipboardIfPermitted()
      .then((clipboardText) => {
        const uri = clipboardText?.trim();
        if (
          uri === undefined ||
          requestID.current !== currentRequestID ||
          openLinkInputRef.current?.value !== '' ||
          parseShareURI(uri) === undefined
        ) {
          return;
        }
        setURIToOpen(uri);
        window.requestAnimationFrame(() => {
          if (
            requestID.current === currentRequestID &&
            openLinkInputRef.current?.value === uri
          ) {
            openLinkInputRef.current?.focus();
          }
        });
      })
      .catch((err: unknown) => {
        log.debug({ err }, 'Failed to read shared link from clipboard');
      });
    editorStore
      .getShareFragment()
      .then((newFragment) => {
        if (requestID.current === currentRequestID) {
          setFragment(newFragment);
        }
      })
      .catch((err: unknown) => {
        log.error({ err }, 'Failed to create share URI');
        if (requestID.current === currentRequestID) {
          setError('Failed to create share URI');
        }
      });
  };

  const shareURI =
    fragment === undefined ? undefined : createShareURI(fragment);
  const desktopURI =
    isElectron || fragment === undefined
      ? undefined
      : createDesktopURI(fragment);
  const hashToOpen = parseShareURI(uriToOpen);

  const copy = () => {
    if (shareURI === undefined) {
      return;
    }
    navigator.clipboard
      .writeText(shareURI)
      .then(() => setCopied(true))
      .catch((err: unknown) => {
        log.error({ err }, 'Failed to copy share URI');
        setError('Failed to copy share URI');
      });
  };

  const openSharedModel = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (hashToOpen === undefined || editorStore === undefined) {
      return;
    }
    restoreFocusAfterClose.current = false;
    editorStore.openShare(hashToOpen);
    close();
  };

  return (
    <>
      <Tooltip title="Share">
        <IconButton
          ref={shareButtonRef}
          disabled={editorStore === undefined}
          onClick={show}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogID : undefined}
          color="inherit"
        >
          <ShareIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog
        open={open}
        onClose={close}
        fullWidth
        maxWidth="sm"
        // MUI captures focus restoration when the focus trap opens, so keep it
        // disabled and restore explicitly after ordinary closes instead.
        disableRestoreFocus
        slotProps={{
          paper: { id: dialogID },
          transition: {
            onExited: () => {
              if (restoreFocusAfterClose.current) {
                shareButtonRef.current?.focus();
              }
            },
          },
        }}
      >
        <DialogTitleBar close={close} title="Share model" />
        <Box sx={{ minWidth: 0, p: 2 }}>
          {error !== undefined && <Alert severity="error">{error}</Alert>}
          {shareURI === undefined && error === undefined ? (
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <CircularProgress size={24} />
              <span>Creating share URI</span>
            </Stack>
          ) : (
            shareURI !== undefined && (
              <Box
                component="button"
                type="button"
                aria-label="Copy share URI"
                aria-describedby={copyStatusID}
                onClick={copy}
                sx={(theme) => ({
                  backgroundColor: theme.palette.action.hover,
                  ...theme.typography.editor,
                  border: 0,
                  borderRadius: 1,
                  color: theme.palette.text.primary,
                  cursor: 'pointer',
                  display: 'block',
                  maxWidth: '100%',
                  overflowX: 'auto',
                  px: 1.5,
                  py: 1,
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  userSelect: 'all',
                  scrollbarWidth: 'none',
                  '::-webkit-scrollbar': {
                    background: 'transparent',
                    width: 0,
                    height: 0,
                  },
                })}
              >
                {shareURI}
              </Box>
            )
          )}
          <Divider sx={{ my: 2 }}>Open a shared link</Divider>
          <Box component="form" id={openLinkFormID} onSubmit={openSharedModel}>
            <TextField
              inputRef={openLinkInputRef}
              label="Shared link"
              value={uriToOpen}
              onChange={(event) => setURIToOpen(event.target.value)}
              error={uriToOpen !== '' && hashToOpen === undefined}
              helperText={
                uriToOpen !== '' && hashToOpen === undefined
                  ? 'Enter a valid shared link'
                  : undefined
              }
              autoComplete="off"
              fullWidth
              size="small"
              spellCheck={false}
              slotProps={{
                htmlInput: {
                  sx: (theme) => ({
                    ...theme.typography.editor,
                  }),
                },
              }}
            />
          </Box>
        </Box>
        <DialogActionBar>
          <Button
            type="submit"
            form={openLinkFormID}
            disabled={hashToOpen === undefined}
            startIcon={<FileOpenIcon />}
            color="inherit"
          >
            Open link
          </Button>
          <Button
            disabled={shareURI === undefined}
            onClick={copy}
            aria-describedby={copyStatusID}
            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
            color="inherit"
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          {!isElectron && (
            <Button
              component="a"
              disabled={desktopURI === undefined}
              href={desktopURI ?? ''}
              target="_blank"
              rel="noreferrer"
              startIcon={<DesktopWindowsIcon />}
              color="inherit"
            >
              Open in desktop
            </Button>
          )}
        </DialogActionBar>
        <Box
          component="span"
          id={copyStatusID}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          sx={visuallyHidden}
        >
          {copied ? 'Share link copied to clipboard' : ''}
        </Box>
      </Dialog>
    </>
  );
}
