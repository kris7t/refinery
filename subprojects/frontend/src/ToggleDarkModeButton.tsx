/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { flushSync } from 'react-dom';

import { useRootStore } from './RootStoreProvider';
import ThemeStore from './theme/ThemeStore';
import getLogger from './utils/getLogger';

const logger = getLogger('ToggleDarkModeButton');

function toggleWithViewTransition(themeStore: ThemeStore, event: React.MouseEvent): void {
  document.body.classList.add('notransition');
  document.documentElement.style.setProperty('--origin-x', `${event.clientX}px`);
  document.documentElement.style.setProperty('--origin-y', `${event.clientY}px`);
  const transition = document.startViewTransition(() => {
    flushSync(() => themeStore.toggleDarkMode());
  });
  transition.finished
    .finally(() => {
      document.body.classList.remove('notransition');
    })
    .catch((error) => {
      logger.error('Transition failed when toggling dark mode', error);
    });
}

function toggleWithoutViewTransition(themeStore: ThemeStore): void {
  document.body.classList.add('notransition');
  try {
    flushSync(() => themeStore.toggleDarkMode());
  } finally {
    document.body.classList.remove('notransition');
  }
}

export default observer(function ToggleDarkModeButton(): JSX.Element {
  const { themeStore } = useRootStore();
  const { darkMode } = themeStore;

  const callback = (event: React.MouseEvent) => {
    if (
      'startViewTransition' in document ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      toggleWithViewTransition(themeStore, event);
    } else {
      toggleWithoutViewTransition(themeStore);
    }
  };

  return (
    <Tooltip title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton color="inherit" onClick={callback}>
        {darkMode ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
});
