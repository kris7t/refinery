/*
 * SPDX-FileCopyrightText: 2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Slide from '@mui/material/Slide';
import { useTheme } from '@mui/material/styles';
import { observer } from 'mobx-react-lite';
import { Suspense, lazy } from 'react';

import Loading from '../Loading';
import { useRootStore } from '../RootStoreProvider';

const AIArea = lazy(() => import('./AIArea'));

const oversizeTop = 48;

function AIPane(): JSX.Element {
  const { themeStore } = useRootStore();
  const theme = useTheme();
  const topOffset = 65 - oversizeTop;
  const topOffsetSmall = 49 - oversizeTop;

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
        <Slide
          direction="down"
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
        </Slide>
      </Box>
    </>
  );
}

export default observer(AIPane);
