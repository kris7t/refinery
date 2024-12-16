/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import BookIcon from '@mui/icons-material/Book';
import GitHubIcon from '@mui/icons-material/GitHub';
import HomeIcon from '@mui/icons-material/Home';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { throttle } from 'lodash-es';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';

import PaneButtons from './PaneButtons';
import { useRootStore } from './RootStoreProvider';
import ToggleDarkModeButton from './ToggleDarkModeButton';
import ConcretizeButton from './editor/ConcretizeButton';
import GenerateButton from './editor/GenerateButton';

function useWindowControlsOverlayVisible(): boolean {
  const [windowControlsOverlayVisible, setWindowControlsOverlayVisible] =
    useState(false);
  const updateWindowControlsOverlayVisible = useMemo(
    () =>
      throttle(
        ({ visible }: WindowControlsOverlayGeometryChangeEvent) =>
          setWindowControlsOverlayVisible(visible),
        250,
      ),
    [],
  );
  useEffect(() => {
    if ('windowControlsOverlay' in navigator) {
      const { windowControlsOverlay } = navigator;
      setWindowControlsOverlayVisible(windowControlsOverlay.visible);
      windowControlsOverlay.addEventListener(
        'geometrychange',
        updateWindowControlsOverlayVisible,
      );
      return () => {
        windowControlsOverlay.removeEventListener(
          'geometrychange',
          updateWindowControlsOverlayVisible,
        );
        updateWindowControlsOverlayVisible.cancel();
      };
    }
    // Nothing to clean up if `windowControlsOverlay` is unsupported.
    return undefined;
  }, [updateWindowControlsOverlayVisible]);
  return windowControlsOverlayVisible;
}

function RefineryIcon({ size }: { size: number }): JSX.Element {
  const theme = useTheme();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 512 515"
    >
      <path
        d="M447.98 179.335c-139.95-9.583-301.272-50.91-384-147.336v46.117C98.45 129.623 209.442 178.137 294.243 199.1c-84.796 20.963-195.791 69.476-230.265 120.985v46.117c82.73-96.422 244.053-137.752 384.002-147.334z"
        fill={theme.palette.text.primary}
      />
      <path
        d="M447.98 296.729c-113.755 4.192-287.485 40.727-384 136.557v46.716c95.14-103.612 279.898-137.754 384-143.745z"
        fill={theme.palette.primary.main}
      />
    </svg>
  );
}

const DevModeBadge = styled('div')(({ theme }) => ({
  ...theme.typography.button,
  display: 'inline-block',
  padding: `0 ${theme.shape.borderRadius}px`,
  background: theme.palette.text.primary,
  color: theme.palette.outer.background,
  borderRadius: theme.shape.borderRadius,
}));

const FileName = styled('span', {
  shouldForwardProp: (prop) => prop !== 'unsavedChanges',
})<{ unsavedChanges: boolean }>(({ theme, unsavedChanges }) => ({
  marginLeft: theme.spacing(1),
  fontWeight: theme.typography.fontWeightLight,
  fontSize: '1.25rem',
  lineHeight: '1.6rem',
  color: unsavedChanges
    ? theme.palette.text.primary
    : theme.palette.text.secondary,
}));

const ButtonStack = styled(Stack)({
  gap: '4px',
  '.rounded': {
    borderRadius: '0px !important',
    clipPath: 'inset(0 2px 0 2px)',
  },
  '.rounded:first-of-type': {
    borderTopLeftRadius: '50em !important',
    borderBottomLeftRadius: '50em !important',
    clipPath: 'inset(0 2px 0 0)',
  },
  '.rounded:last-of-type': {
    borderTopRightRadius: '50em !important',
    borderBottomRightRadius: '50em !important',
    clipPath: 'inset(0 0 0 2px)',
  },
  '.rounded:first-of-type:last-of-type': {
    clipPath: 'none',
  },
});

export default observer(function TopBar(): JSX.Element {
  const { editorStore, themeStore } = useRootStore();
  const overlayVisible = useWindowControlsOverlayVisible();
  const { breakpoints } = useTheme();
  const medium = useMediaQuery(breakpoints.up('sm'));
  const large = useMediaQuery(breakpoints.up('md'));
  const veryLarge = useMediaQuery(breakpoints.up('lg'));
  const extraLarge = useMediaQuery(breakpoints.up('xl'));

  return (
    <AppBar
      position="static"
      elevation={0}
      color="transparent"
      sx={(theme) => ({
        background: theme.palette.outer.background,
        borderBottom: `1px solid ${theme.palette.outer.border}`,
        appRegion: 'drag',
        '.MuiButtonBase-root': {
          appRegion: 'no-drag',
        },
      })}
    >
      <Toolbar
        sx={{
          ...(overlayVisible
            ? {
                marginLeft: 'env(titlebar-area-x, 0)',
                marginTop: 'env(titlebar-area-y, 0)',
                width: 'env(titlebar-area-width, 100%)',
                minHeight: 'env(titlebar-area-height, auto)',
              }
            : {
                minHeight: 'auto',
              }),
          py: 0.5,
        }}
      >
        <RefineryIcon size={32} />
        <Typography variant="h6" component="h1" pl={1}>
          Refinery {import.meta.env.DEV && <DevModeBadge>Dev</DevModeBadge>}
        </Typography>
        {large &&
          editorStore?.simpleName !== undefined &&
          !themeStore?.insideIDE && (
            <FileName unsavedChanges={editorStore.unsavedChanges}>
              {editorStore.simpleName}
            </FileName>
          )}
        <Stack direction="row" alignItems="center" flexGrow={1} marginLeft={1}>
          {medium && !large && (
            <PaneButtons themeStore={themeStore} hideLabel />
          )}
        </Stack>
        {large && (
          <Stack
            direction="row"
            alignItems="center"
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <PaneButtons themeStore={themeStore} />
          </Stack>
        )}
        <Stack direction="row" marginLeft={1} gap={1} alignItems="center">
          {veryLarge && !themeStore.insideIDE && (
            <Stack direction="row" alignItems="center">
              <Tooltip title="Refinery home page">
                <IconButton
                  href="https://refinery.tools/"
                  target="_blank"
                  color="inherit"
                >
                  <HomeIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refinery documentation">
                <IconButton
                  href="https://refinery.tools/learn/"
                  target="_blank"
                  color="inherit"
                >
                  <BookIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Check us out at GitHub">
                <IconButton
                  href="https://github.com/graphs4value/refinery"
                  target="_blank"
                  color="inherit"
                >
                  <GitHubIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
          <ButtonStack direction="row">
            {medium && <ConcretizeButton editorStore={editorStore} />}
            <GenerateButton
              editorStore={editorStore}
              hideWarnings={!extraLarge}
            />
          </ButtonStack>
          {!themeStore?.insideIDE && <ToggleDarkModeButton />}
        </Stack>
      </Toolbar>
    </AppBar>
  );
});
