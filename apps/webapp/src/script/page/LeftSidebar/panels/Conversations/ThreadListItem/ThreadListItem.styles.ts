/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {DIAMETER, AVATAR_SIZE} from 'Components/Avatar';

const THREAD_ICON_SIZE = DIAMETER[AVATAR_SIZE.SMALL];
const CONTEXT_ICON_SIZE = DIAMETER[AVATAR_SIZE.XX_SMALL];

export const threadIconWrapper = (isActive: boolean): CSSObject => ({
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  width: `${THREAD_ICON_SIZE}px`,
  height: `${THREAD_ICON_SIZE}px`,
  borderRadius: '6px',
  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.18)' : '#e7f0fa',
  color: isActive ? 'var(--app-bg-secondary)' : '#0667c8',

  'body.theme-dark &': {
    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.18)' : 'rgba(6, 103, 200, 0.2)',
    color: isActive ? 'var(--app-bg-secondary)' : '#4d9ae8',
  },
});

export const threadIcon: CSSObject = {
  width: '14px',
  height: '14px',
};

export const secondaryRow: CSSObject = {
  display: 'flex',
  minWidth: 0,
  alignItems: 'center',
  gap: '6px',
};

export const contextIconWrapper: CSSObject = {
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  width: `${CONTEXT_ICON_SIZE}px`,
  height: `${CONTEXT_ICON_SIZE}px`,
};

export const contextIconPlaceholder: CSSObject = {
  width: `${CONTEXT_ICON_SIZE}px`,
  height: `${CONTEXT_ICON_SIZE}px`,
  flexShrink: 0,
  borderRadius: '50%',
  backgroundColor: 'var(--background-fade-16)',
};

export const conversationName: CSSObject = {
  overflow: 'hidden',
  minWidth: 0,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const replyCount: CSSObject = {
  flexShrink: 0,
  whiteSpace: 'nowrap',
};
