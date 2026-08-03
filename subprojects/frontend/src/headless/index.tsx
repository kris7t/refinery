/*
 * SPDX-FileCopyrightText: 2026 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { styled, ThemeProvider } from '@mui/material/styles';
import { configure } from 'mobx';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { lightTheme } from '../theme/ThemeProvider';

import HeadlessApp from './HeadlessApp';
import HeadlessStore from './HeadlessStore';
import serveIPCRequests from './serveIPCRequests';

// Make sure `styled` ends up in the entry chunk.
// https://github.com/mui/material-ui/issues/32727#issuecomment-1659945548
(window as unknown as { fixViteIssue: unknown }).fixViteIssue = styled;

configure({
  enforceActions: 'always',
});

const store = new HeadlessStore();

document.fonts.addEventListener('loadingdone', () => serveIPCRequests(store));

document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('app');
  if (rootElement !== null) {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ThemeProvider theme={lightTheme}>
          <CssBaseline enableColorScheme />
          <Box>
            <HeadlessApp store={store} />
          </Box>
        </ThemeProvider>
      </StrictMode>,
    );
  }
});
