/*
 * SPDX-FileCopyrightText: 2021-2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import Grow from '@mui/material/Grow';
import Stack from '@mui/material/Stack';
import { SnackbarProvider } from 'notistack';

import TopBar from './TopBar';
import UpdateNotification from './UpdateNotification';
import WorkArea from './WorkArea';
import AIPane from './ai/AIPane';

export default function Refinery(): JSX.Element {
  return (
    <SnackbarProvider TransitionComponent={Grow}>
      <UpdateNotification />
      <Stack
        sx={{
          position: 'relative',
          flexDirection: 'column',
          height: '100%',
          overflow: 'auto',
        }}
      >
        <TopBar />
        <AIPane />
        <WorkArea />
      </Stack>
    </SnackbarProvider>
  );
}
