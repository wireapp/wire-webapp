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

const THREAD_ICON_SIZE = 40;
const CONTEXT_ICON_SIZE = DIAMETER[AVATAR_SIZE.XX_SMALL];

export const listItem: CSSObject = {
  position: 'relative',
  listStyle: 'none',
  backgroundColor: 'var(--app-bg)',

  ':not(:last-child)': {
    borderBottom: '1px solid var(--border-color)',
  },

  ':hover': {
    backgroundColor: 'var(--background-fade-8)',
  },
};

export const openButton: CSSObject = {
  display: 'flex',
  width: '100%',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '12px 16px',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  textAlign: 'left',

  ':focus-visible': {
    outline: '2px solid var(--accent-color)',
    outlineOffset: '-2px',
  },
};

export const threadIconWrapper: CSSObject = {
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  width: `${THREAD_ICON_SIZE}px`,
  height: `${THREAD_ICON_SIZE}px`,
  borderRadius: '8px',
  backgroundColor: '#e7f0fa',
  color: '#0667c8',

  'body.theme-dark &': {
    backgroundColor: 'rgba(6, 103, 200, 0.2)',
    color: '#4d9ae8',
  },
};

export const threadIcon: CSSObject = {
  width: '18px',
  height: '18px',
};

export const content: CSSObject = {
  display: 'flex',
  minWidth: 0,
  flex: '1 1 auto',
  flexDirection: 'column',
  gap: '4px',
  paddingRight: '28px',
};

export const primaryText = (isUnread: boolean): CSSObject => ({
  overflow: 'hidden',
  color: 'var(--foreground)',
  fontSize: 'var(--font-size-medium)',
  fontWeight: isUnread ? 'var(--font-weight-bold)' : 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-md)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const secondaryRow: CSSObject = {
  display: 'flex',
  minWidth: 0,
  alignItems: 'center',
  gap: '6px',
  fontSize: 'var(--font-size-xsmall)',
  lineHeight: 'var(--line-height-xs)',
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
  color: 'var(--main-color)',
  fontWeight: 'var(--font-weight-regular)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
};

export const replyCount: CSSObject = {
  flexShrink: 0,
  color: 'var(--text-input-placeholder)',
  fontWeight: 'var(--font-weight-regular)',
  whiteSpace: 'nowrap',
};

export const unreadBadge: CSSObject = {
  position: 'absolute',
  top: '12px',
  right: '16px',
  minWidth: '18px',
  height: '18px',
  padding: '0 4px',
  borderRadius: '4px',
  backgroundColor: 'var(--foreground)',
  color: 'var(--app-bg-secondary)',
  fontSize: 'var(--font-size-xsmall)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: '18px',
  textAlign: 'center',
  pointerEvents: 'none',
};
