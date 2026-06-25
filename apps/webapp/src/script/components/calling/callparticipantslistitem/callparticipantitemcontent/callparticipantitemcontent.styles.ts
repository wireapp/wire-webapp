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
  background: 'none',
  padding: 0,
  alignItems: 'center',
  display: 'flex',
  height: '16px',
  justifyContent: 'center',
  opacity: '0',
  transition: 'opacity 0.25s ease-in-out',
  minWidth: '16px',
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

export const nameWrapper = (isAudioEstablished: boolean): CSSObject => ({
  color: isAudioEstablished ? 'var(--main-color)' : 'var(--text-input-placeholder)',
  display: 'flex',
  overflow: 'hidden',
  width: '100%',
  paddingRight: '8px',
});

export const selfIndicator: CSSObject = {
  marginLeft: '4px',
};
