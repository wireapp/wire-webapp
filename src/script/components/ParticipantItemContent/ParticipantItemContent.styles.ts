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
  ['.participant-item-wrapper:hover &, .participant-item-wrapper:focus &, .participant-item-wrapper:focus-visible &']: {
    opacity: '1',
  },
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
  minWidth: 0,
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

export const userAvailability: CSSObject = {
  '.availability-state-label': ellipsis,
  '.availability-state-icon': {
    display: 'flex',
  },
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

/* TODO: It's not used, saved for future if it will be needed, and add prop badge */
// export const badge: CSSObject = {
//   '&::before': {
//     content: '"·"', // Unicode: \00B7
//     display: 'inline-block',
//     marginInline: '4px',
//   },
// };
