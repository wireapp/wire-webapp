/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {CSSObject} from '@emotion/react';

export const messageActionsGroup: CSSObject = {
  display: 'flex',
  marginLeft: '8px',
  padding: '2px',
};

export const messageBodyActions: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '32px',
  minWidth: '40px',
  position: 'absolute',
  right: '-40px',
  top: '-34px',
  userSelect: 'none',
  '@media (max-width: 768px)': {
    height: '45px',
    flexDirection: 'column',
  },
};

export const messageActionsMenuButton = (isReactable = true): CSSObject => {
  const defaultStyle: CSSObject = {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '8px 12px',
    cursor: 'pointer',
  };
  if (isReactable) {
    return {
      ...defaultStyle,
      '&:first-of-type': {
        borderRadius: '12px 0px 0px 12px',
      },
      '&:last-of-type': {
        borderRadius: '0px 12px 12px 0px',
      },
    };
  }
  return {
    ...defaultStyle,
    borderRadius: '12px',
  };
};

export const getIconCSS: CSSObject = {
  'body.theme-dark &': {
    'svg path': {
      fill: 'var(--white)',
    },
    'svg path:nth-of-type(2)': {
      stroke: 'var(--white)',
    },
  },
};

export const getActionsMenuCSS = (isActive?: boolean): CSSObject => {
  if (isActive) {
    return {
      border: '1px solid var(--message-actions-active-border)',
      backgroundColor: 'var(--message-actions-active-background)',
      color: 'var(--accent-color)',
      outline: 'none',
    };
  }
  return {
    border: '1px solid var(--message-actions-border)',
    backgroundColor: 'var(--message-actions-background)',
    outline: 'none',

    '&:hover': {
      backgroundColor: 'var(--message-actions-background-hover)',
      border: '1px solid var(--message-actions-border-hover)',
    },
    '&:focus-visible': {
      border: '1px solid var(--accent-color-focus)',
      outline: 'none',
    },
  };
};

export const messageWithHeaderTop: CSSObject = {
  top: '-58px',
};
