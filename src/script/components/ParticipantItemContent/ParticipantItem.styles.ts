/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

export const listWrapper = ({isHighlighted = false, noUnderline = false, noInteraction = false}): CSSObject => ({
  position: 'relative',
  display: 'block',
  margin: '1px',
  alignItems: 'center',

  '&:hover, &:focus, &:focus-visible': {
    background: 'var(--app-bg-secondary)',
    '&::after': {
      borderBottom: 'none',
    },
  },

  '&:hover [data-hoverClass="chevron-icon"], &:focus, &:focus-visible [data-hoverClass="chevron-icon"]': {
    opacity: 1,
  },

  ...(!noInteraction && {
    transition: 'background-color 0.15s ease-in-out',
    '&:hover': {
      backgroundColor: 'var(--app-bg-secondary)',
    },
    '&:focus-visible': {
      backgroundColor: 'var(--app-bg-secondary)',
      outline: '1px solid var(--accent-color-focus)',
    },
  }),

  'input[type="checkbox"] + label > span': {
    width: 'calc(100% - 22px - 0.75rem)',
  },

  ...(!noUnderline && {
    '&::after': {
      position: 'absolute',
      right: 0,
      bottom: 0,
      left: 'var(--left-list-item-left-width)',
      borderBottom: '1px solid var(--gray-40)',
      content: '""',
    },
  }),

  ...(isHighlighted && {
    animation: 'fadeInUserHighlighting 1s var(--ease-out-quart)',
    backgroundColor: 'var(--background-fade-8)',
  }),

  'body.theme-dark &': {
    ...(!noUnderline && {
      '&::after': {
        borderBottomColor: 'var(--gray-90)',
      },
    }),
  },
});

export const listItem = (noInteraction = false): CSSObject => ({
  display: 'flex',
  overflow: 'hidden',
  height: '56px',
  alignItems: 'center',
  paddingRight: '16px',
  margin: '0',
  cursor: noInteraction ? 'default' : 'pointer',
});

export const chevronIcon: CSSObject = {
  border: 'none',
  padding: 0,
  alignItems: 'center',
  display: 'flex',
  height: '16px',
  justifyContent: 'center',
  opacity: '0',
  transition: 'opacity 0.25s ease-in-out',
  width: '16px',
  svg: {
    width: '8px',
    path: {
      fill: 'currentColor',
    },
  },
};

export const ellipsis: CSSObject = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'pre',
};

export const wrapper: CSSObject = {
  display: 'flex',
  width: 0,
  height: 'var(--avatar-diameter-m)',
  flex: '1 1',
  alignItems: 'center',
  lineHeight: 'var(--line-height-sm)',
};

export const contentText: CSSObject = {
  display: 'flex',
  minWidth: 0, // this will ensure that ellipses is working
  minHeight: 'var(--avatar-diameter-m)',
  flexDirection: 'column',
  flexGrow: 1,
  alignItems: 'flex-start',
  justifyContent: 'center',
  fontSize: 'var(--font-size-medium)',
  // @ts-ignore using variables
  fontWeight: 'var(--font-weight-medium)',
};

export const nameWrapper: CSSObject = {
  color: 'var(--main-color)',
  display: 'flex',
  overflow: 'hidden',
  width: '100%',
  paddingRight: '8px',
};

export const userName: CSSObject = {
  maxWidth: '100%',
  whiteSpace: 'nowrap',
};

export const selfIndicator: CSSObject = {
  marginLeft: '4px',
};

export const contentInfoWrapper: CSSObject = {
  display: 'flex',
  width: '100%',
  marginTop: '4px',
  color: 'var(--background)',
};

export const contentInfoText = (noPointer = false): CSSObject => ({
  maxWidth: '100%',
  whiteSpace: 'nowrap',
  ...(!noPointer && {
    cursor: 'text',
    userSelect: 'initial',
  }),
});
