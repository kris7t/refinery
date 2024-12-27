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

function AIPane(): JSX.Element {
  const { themeStore } = useRootStore();
  const theme = useTheme();
  const topOffset = 65 - oversizeTop;
  const topOffsetSmall = 49 - oversizeTop;
  const prefersReducedMotion = useMediaQuery(
    '(prefers-reduced-motion: reduce)',
  );

  return (
    <>
      <Backdrop
        open={themeStore.showAI}
        sx={{ zIndex: 1499 }}
        onClick={() => themeStore.toggleAI()}
      />
      <Box
        sx={{
          position: 'absolute',
          top: topOffsetSmall,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1500,
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
            elevation={24}
            sx={{
              width: '100vw',
              maxWidth: 800,
              height: `calc(100vh - ${topOffsetSmall}px)`,
              maxHeight: 600 + oversizeTop,
              padding: `calc(${theme.spacing(2)} + ${oversizeTop}px) ${theme.spacing(2)} ${theme.spacing(2)} ${theme.spacing(2)}`,
              background: theme.palette.background.default,
              [theme.breakpoints.up('sm')]: {
                height: `calc(100vh - ${topOffset}px)`,
              },
            }}
          >
            <Suspense fallback={<Loading transparent />}>
              <AIArea />
            </Suspense>
          </Paper>
        </Transition>
      </Box>
    </>
  );
}

export default observer(AIPane);
