/*
 * SPDX-FileCopyrightText: 2023-2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import Dialog from '@mui/material/Dialog';
import Fade, { type FadeProps } from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Slide, { type SlideProps } from '@mui/material/Slide';
import Tooltip from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import React, { useCallback, useId, useState } from 'react';

import SlideInDialog from './SlideInDialog';

const SlideInPanelRoot = styled('div', {
  name: 'SlideInPanel-Root',
  shouldForwardProp: (propName) => propName !== 'anchor',
})<{ anchor: 'left' | 'right' }>(({ theme, anchor }) => ({
  position: 'absolute',
  padding: theme.spacing(1),
  top: 0,
  [anchor]: 0,
  maxHeight: '100%',
  maxWidth: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: anchor === 'left' ? 'start' : 'end',
  '.SlideInPanel-drawer': {
    overflow: 'hidden',
    display: 'flex',
    maxWidth: '100%',
    margin: theme.spacing(1),
  },
}));

function Transition({
  prefersReducedMotion,
  anchor,
  ...props
}: {
  prefersReducedMotion: boolean;
  anchor: 'left' | 'right';
} & FadeProps &
  SlideProps): JSX.Element {
  return prefersReducedMotion ? (
    <Fade {...props} />
  ) : (
    <Slide direction={anchor === 'left' ? 'right' : 'left'} {...props} />
  );
}

export default function SlideInPanel({
  anchor,
  dialog,
  title,
  icon,
  iconLabel,
  buttons,
  children,
  onKeyDown,
  onKeyUp,
  onMouseMove,
}: {
  anchor: 'left' | 'right';
  dialog: boolean;
  title: string;
  icon: (show: boolean) => React.ReactNode;
  iconLabel: string;
  buttons: React.ReactNode | ((close: () => void) => React.ReactNode);
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onKeyUp?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}): JSX.Element {
  const id = useId();
  const [show, setShow] = useState(false);
  const close = useCallback(() => setShow(false), []);
  const prefersReducedMotion = useMediaQuery(
    '(prefers-reduced-motion: reduce)',
  );

  return (
    <SlideInPanelRoot
      anchor={anchor}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onMouseMove={onMouseMove}
    >
      <Tooltip
        title={iconLabel}
        placement={anchor === 'left' ? 'right' : 'left'}
      >
        <IconButton
          role="switch"
          aria-checked={show}
          aria-controls={dialog ? undefined : id}
          onClick={() => setShow(!show)}
        >
          {icon(show)}
        </IconButton>
      </Tooltip>
      {dialog ? (
        <Dialog open={show} onClose={close} maxWidth="xl">
          <SlideInDialog close={close} dialog title={title} buttons={buttons}>
            {children}
          </SlideInDialog>
        </Dialog>
      ) : (
        <Transition
          prefersReducedMotion={prefersReducedMotion}
          anchor={anchor}
          in={show}
          id={id}
          mountOnEnter
          unmountOnExit
        >
          <Paper className="SlideInPanel-drawer" elevation={4}>
            <SlideInDialog close={close} title={title} buttons={buttons}>
              {children}
            </SlideInDialog>
          </Paper>
        </Transition>
      )}
    </SlideInPanelRoot>
  );
}
