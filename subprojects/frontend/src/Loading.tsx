/*
 * SPDX-FileCopyrightText: 2021-2023 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import CircularProgress from '@mui/material/CircularProgress';
import { styled } from '@mui/material/styles';

const LoadingRoot = styled('div', {
  name: 'Loading-Root',
  shouldForwardProp: (propName) => propName !== 'transparent',
})<{ transparent: boolean }>(({ theme, transparent }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: transparent ? 'transparent' : theme.palette.outer.background,
}));

export default function Loading({
  transparent = false,
}: {
  transparent?: boolean;
}): JSX.Element {
  return (
    <LoadingRoot transparent={transparent}>
      <CircularProgress size={60} color="inherit" />
    </LoadingRoot>
  );
}
