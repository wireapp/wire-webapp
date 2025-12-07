/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

export const callingHeaderContainer: CSSObject = {
  alignItems: 'center',
  borderRadius: '8px 8px 0 0',
  cursor: 'pointer',
  display: 'flex',
  fontWeight: 'var(--font-weight-regular)',
  marginBottom: '8px',
  position: 'relative',
  width: '100%',
};

export const callingHeaderWrapper: CSSObject = {
  alignItems: 'center',
  display: 'flex',
  gap: '12px',
  width: '100%',
  overflow: 'hidden',
};

export const callAvatar: CSSObject = {
  alignItems: 'center',
  display: 'flex',
};

export const conversationCallName: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-medium)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const callDescription: CSSObject = {
  color: 'var(--background)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-regular)',
};

export const callDetails: CSSObject = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  paddingRight: '12px',
  width: '100%',
};

export const cbrCallState: CSSObject = {
  fontWeight: 'var(--font-weight-semibold)',
  marginLeft: '6px',
};

export const detachedWindowButton: CSSObject = {
  alignItems: 'center',
  background: 'transparent',
  border: 'none',
  display: 'flex',
  justifyContent: 'center',
  padding: '8px 12px',

  '& svg': {
    fill: 'var(--text-color)',
  },

  '& svg path': {
    fill: 'var(--text-color)',
  },
};
