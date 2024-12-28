/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Fade, { type FadeProps } from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Slide, { type SlideProps } from '@mui/material/Slide';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { observer } from 'mobx-react-lite';
import { Suspense, lazy } from 'react';

import Loading from '../Loading';
import { useRootStore } from '../RootStoreProvider';

const AIArea = lazy(() => import('./AIArea'));

const oversizeTop = 48;

const barHeight = 64;

const barHeightSmall = 48;

const topOffset = barHeight - oversizeTop;

const topOffsetSmall = barHeightSmall - oversizeTop;

function Transition({
  prefersReducedMotion,
  ...props
}: {
  prefersReducedMotion: boolean;
} & FadeProps &
  SlideProps): JSX.Element {
  return prefersReducedMotion ? (
    <Fade {...props} />
  ) : (
    <Slide direction="down" {...props} />
  );
}

function FadeInShadow({
  in: isIn,
  top,
  topSmall,
  zIndex,
  elevation,
}: {
  in: boolean;
  top: number;
  topSmall?: number;
  zIndex: number;
  elevation: number;
}): JSX.Element {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'absolute',
        top: topSmall ?? top,
        ...(topSmall === undefined
          ? {}
          : {
              [theme.breakpoints.up('sm')]: {
                top,
              },
            }),
        left: 0,
        width: '100%',
        height: 64,
        zIndex,
        pointerEvents: 'none',
        overflow: 'hidden',
        transform: `scaleY(${isIn ? 1 : 0})`,
        transformOrigin: 'top',
        transition: theme.transitions.create('transform', {
          duration: isIn
            ? theme.transitions.duration.enteringScreen
            : theme.transitions.duration.leavingScreen,
        }),
        ['@media (prefers-reduced-motion: reduce)']: {
          transform: 'none',
          opacity: isIn ? 1 : 0,
          transition: theme.transitions.create('opacity', {
            duration: isIn
              ? theme.transitions.duration.enteringScreen
              : theme.transitions.duration.leavingScreen,
          }),
        },
      }}
      aria-hidden="true"
    >
      <Box
        sx={{
          position: 'absolute',
          left: -100,
          top: -100,
          height: 100,
          width: 'calc(100% + 200px)',
          boxShadow: theme.shadows[elevation] ?? 'none',
        }}
      />
    </Box>
  );
}

function AIPane(): JSX.Element {
  const { themeStore } = useRootStore();
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery(
    '(prefers-reduced-motion: reduce)',
  );
  const minHeight = `${600 + oversizeTop}px`;
  const maxHeight = `calc(100vh - ${topOffset}px - ${theme.spacing(2)})`;
  const maxHeightSmall = `calc(100vh - ${topOffsetSmall}px - ${theme.spacing(2)})`;

  return (
    <>
      <Backdrop
        open={themeStore.showAI}
        sx={{ zIndex: 1150 }}
        onClick={() => themeStore.toggleAI()}
      />
      <Box
        sx={{
          position: 'absolute',
          top: topOffsetSmall,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1175,
          [theme.breakpoints.up('sm')]: {
            top: topOffset,
          },
        }}
      >
        <Transition
          prefersReducedMotion={prefersReducedMotion}
          in={themeStore.showAI}
          mountOnEnter
          unmountOnExit
        >
          <Paper
            elevation={10}
            sx={{
              width: '100vw',
              maxWidth: 800,
              maxHeight: maxHeightSmall,
              minHeight: `calc(min(${minHeight}, ${maxHeightSmall}))`,
              padding: `calc(${theme.spacing(2)} + ${oversizeTop}px) ${theme.spacing(2)} ${theme.spacing(2)} ${theme.spacing(2)}`,
              background: theme.palette.background.default,
              [theme.breakpoints.up('sm')]: {
                maxHeight,
                minHeight: `calc(min(${minHeight}, ${maxHeight}))`,
              },
              [theme.breakpoints.up('xl')]: {
                maxWidth: 1200,
              },
            }}
          >
            <Suspense fallback={<Loading transparent />}>
              <AIArea />
            </Suspense>
          </Paper>
        </Transition>
        <FadeInShadow
          in={themeStore.showAI}
          top={oversizeTop}
          zIndex={1199}
          elevation={6}
        />
      </Box>
      <FadeInShadow
        in={themeStore.showAI}
        top={barHeight}
        topSmall={barHeightSmall}
        zIndex={1149}
        elevation={16}
      />
    </>
  );
}

export default observer(AIPane);
