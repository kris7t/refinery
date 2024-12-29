/*
 * SPDX-FileCopyrightText: 2023-2024 The Refinery Authors <https://refinery.tools/>
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import FilterListIcon from '@mui/icons-material/FilterList';
import LabelIcon from '@mui/icons-material/Label';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import TuneIcon from '@mui/icons-material/Tune';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { styled } from '@mui/material/styles';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';

import Tooltip from '../Tooltip';
import isBuiltIn from '../utils/isBuiltIn';

import type GraphStore from './GraphStore';
import { isVisibilityAllowed } from './GraphStore';
import RelationName from './RelationName';
import SlideInPanel from './SlideInPanel';

const VisibilityDialogScroll = styled('div', {
  name: 'VisibilityDialog-Scroll',
})(({ theme }) => {
  return {
    contain: 'content',
    display: 'flex',
    flexDirection: 'column',
    height: 'auto',
    overflowX: 'hidden',
    overflowY: 'auto',
    margin: `0 ${theme.spacing(2)}`,
    '& table': {
      // We use flexbox instead of `display: table` to get proper text-overflow
      // behavior for overly long relation names.
      display: 'flex',
      flexDirection: 'column',
    },
    '& thead, & tbody': {
      display: 'flex',
      flexDirection: 'column',
    },
    '& thead': {
      position: 'sticky',
      top: 0,
      zIndex: 999,
      backgroundColor:
        theme.palette.mode === 'dark'
          ? theme.palette.outer.elevated
          : theme.palette.background.paper,
      '& tr': {
        height: '44px',
      },
    },
    '& tr': {
      display: 'flex',
      flexDirection: 'row',
      maxWidth: '100%',
    },
    '& tbody tr': {
      transition: theme.transitions.create('background', {
        duration: theme.transitions.duration.shortest,
      }),
      '&:hover': {
        background: theme.palette.action.hover,
        '@media (hover: none)': {
          background: 'transparent',
        },
      },
    },
    '& th, & td': {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      // Set width in advance, since we can't rely on `display: table-cell`.
      width: '44px',
    },
    '& th:nth-of-type(3), & td:nth-of-type(3)': {
      justifyContent: 'start',
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(2),
      // Only let the last column grow or shrink.
      flexGrow: 1,
      flexShrink: 1,
      // Compute the maximum available space in advance to let the text overflow.
      maxWidth: 'calc(100% - 88px)',
      width: 'min-content',
    },
    '& td:nth-of-type(3)': {
      position: 'relative',
    },

    '& thead th, .VisibilityDialog-custom tr:last-child td': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    '.VisibilityDialog-toggleVisibility': {
      // Hack to apply `text-overflow`.
      maxWidth: '100%',
      overflow: 'hidden',
      wordWrap: 'nowrap',
      textOverflow: 'ellipsis',
      background: 'transparent',
      border: 'none',
      font: 'inherit',
      lineHeight: 'inherit',
      cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent',
      '&::after': {
        content: '" "',
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
    '.VisibilityDialog-empty': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      color: theme.palette.text.secondary,
    },
    '.VisibilityDialog-emptyIcon': {
      fontSize: '6rem',
      marginBottom: theme.spacing(1),
    },
  };
});

function VisibilityPanel({
  graph,
  dialog,
}: {
  graph: GraphStore;
  dialog: boolean;
}): JSX.Element {
  const builtinRows: JSX.Element[] = [];
  const rows: JSX.Element[] = [];
  graph.relationMetadata.forEach((metadata, name) => {
    if (!isVisibilityAllowed(metadata, 'must')) {
      return;
    }
    const visibility = graph.getVisibility(name);
    const row = (
      <tr key={metadata.name}>
        <td>
          <Tooltip title="Show true and error values" placement="top">
            <Checkbox
              checked={visibility !== 'none'}
              aria-label={`Show true and error values of ${metadata.simpleName}`}
              onClick={() =>
                graph.setVisibility(
                  name,
                  visibility === 'none' ? 'must' : 'none',
                )
              }
            />
          </Tooltip>
        </td>
        <td>
          <Tooltip title="Show all values" placement="top">
            <Checkbox
              checked={visibility === 'all'}
              disabled={!isVisibilityAllowed(metadata, 'all')}
              aria-label={`Show all values of ${metadata.simpleName}`}
              onClick={() =>
                graph.setVisibility(name, visibility === 'all' ? 'must' : 'all')
              }
            />
          </Tooltip>
        </td>
        <td>
          <button
            type="button"
            onClick={() => graph.cycleVisibility(name)}
            aria-label={`Toggle visibility of ${metadata.simpleName}`}
            className="VisibilityDialog-toggleVisibility"
          >
            <RelationName metadata={metadata} abbreviate={graph.abbreviate} />
          </button>
        </td>
      </tr>
    );
    if (isBuiltIn(metadata)) {
      builtinRows.push(row);
    } else {
      rows.push(row);
    }
  });

  const hasRows = rows.length > 0 || builtinRows.length > 0;

  const hideBadge = graph.visibility.size === 0;
  const icon = useCallback(
    (show: boolean) => (
      <Badge color="primary" variant="dot" invisible={hideBadge}>
        {show && !dialog ? <ChevronLeftIcon /> : <TuneIcon />}
      </Badge>
    ),
    [dialog, hideBadge],
  );

  return (
    <SlideInPanel
      anchor="left"
      dialog={dialog}
      title="Customize view"
      icon={icon}
      iconLabel="Filter panel"
      buttons={
        <>
          <Button
            color="inherit"
            onClick={() => graph.hideAll()}
            startIcon={<VisibilityOffIcon />}
          >
            Hide all
          </Button>
          <Button
            color="inherit"
            onClick={() => graph.resetFilter()}
            startIcon={<FilterListIcon />}
          >
            Reset filter
          </Button>
        </>
      }
    >
      <FormControlLabel
        control={
          <Switch
            checked={!graph.abbreviate}
            onClick={() => graph.toggleAbbrevaite()}
          />
        }
        label="Fully qualified names"
      />
      <FormControlLabel
        control={
          <Switch checked={graph.scopes} onClick={() => graph.toggleScopes()} />
        }
        label="Object scopes"
      />
      <VisibilityDialogScroll>
        {hasRows ? (
          <table cellSpacing={0}>
            <thead>
              <tr>
                <th aria-label="Show true and error values">
                  <LabelIcon />
                </th>
                <th aria-label="Show unknown values">
                  <LabelOutlinedIcon />
                </th>
                <th>Symbol</th>
              </tr>
            </thead>
            <tbody className="VisibilityDialog-custom">{...rows}</tbody>
            <tbody className="VisibilityDialog-builtin">{...builtinRows}</tbody>
          </table>
        ) : (
          <div className="VisibilityDialog-empty">
            <SentimentVeryDissatisfiedIcon
              className="VisibilityDialog-emptyIcon"
              fontSize="inherit"
            />
            <div>Partial model is empty</div>
          </div>
        )}
      </VisibilityDialogScroll>
    </SlideInPanel>
  );
}

export default observer(VisibilityPanel);
