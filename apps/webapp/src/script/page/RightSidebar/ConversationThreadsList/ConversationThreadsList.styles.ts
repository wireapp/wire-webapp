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

import {AVATAR_SIZE, DIAMETER} from 'Components/Avatar';

const MAIN_AVATAR_SIZE = AVATAR_SIZE.SMALL;
const META_AVATAR_SIZE = AVATAR_SIZE.XX_SMALL;
const AVATAR_COLUMN_WIDTH = `${DIAMETER[MAIN_AVATAR_SIZE]}px`;
const AVATAR_COLUMN_GAP = '12px';

export const panelPage: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  backgroundColor: 'var(--app-bg-secondary)',
};

export const list: CSSObject = {
  margin: 0,
  padding: 0,
  listStyle: 'none',
  backgroundColor: 'var(--app-bg-secondary)',
};

export const listItem = (isActive: boolean): CSSObject => ({
  position: 'relative',
  backgroundColor: isActive ? 'var(--background-fade-8)' : 'var(--app-bg-secondary)',

  ':not(:last-child)': {
    borderBottom: '1px solid var(--border-color)',
  },

  ':hover': {
    backgroundColor: 'var(--background-fade-8)',
  },
});

export const panelHeader: CSSObject = {
  display: 'flex',
  flexShrink: 0,
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '8px',
  padding: '12px 8px 12px 16px',
  borderBottom: '1px solid var(--border-color)',
  backgroundColor: 'var(--app-bg-secondary)',
};

export const headerTextBlock: CSSObject = {
  display: 'flex',
  minWidth: 0,
  flex: '1 1 auto',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '2px',
  textAlign: 'left',
};

export const headerTitle: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  margin: 0,
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-bold)',
  lineHeight: 'var(--line-height-sm)',
};

export const headerSubtitle: CSSObject = {
  margin: 0,
  color: 'var(--text-input-placeholder)',
  fontSize: 'var(--font-size-xsmall)',
  lineHeight: 'var(--line-height-xs)',
  textAlign: 'left',
};

export const closeButton: CSSObject = {
  display: 'flex',
  width: '40px',
  height: '40px',
  flexShrink: 0,
  alignItems: 'center',
  alignSelf: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'var(--foreground)',
  cursor: 'pointer',

  svg: {
    fill: 'currentColor',
  },

  ':hover': {
    backgroundColor: 'var(--background-fade-8)',
  },
};

export const openButton: CSSObject = {
  display: 'flex',
  width: '100%',
  alignItems: 'flex-start',
  padding: '12px 16px',
  border: 'none',
  background: 'transparent',
  color: 'var(--foreground)',
  cursor: 'pointer',
  gap: AVATAR_COLUMN_GAP,
  textAlign: 'left',
  flexDirection: 'column',
};

export const avatarCell: CSSObject = {
  width: AVATAR_COLUMN_WIDTH,
  height: AVATAR_COLUMN_WIDTH,
  flexShrink: 0,
};

export const avatarPlaceholder: CSSObject = {
  width: AVATAR_COLUMN_WIDTH,
  height: AVATAR_COLUMN_WIDTH,
  flexShrink: 0,
};

export const rowContent: CSSObject = {
  display: 'flex',
  width: '100%',
  minWidth: 0,
  flex: '1 1 auto',
  flexDirection: 'row',
  alignItems: 'center',
  gap: AVATAR_COLUMN_GAP,
};

export const nameRow: CSSObject = {
  display: 'flex',
  flex: '1 1 auto',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: '2px',
  minWidth: 0,
  paddingRight: '28px',
};

export const nameRowHeader: CSSObject = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'flex-start',
  gap: '6px',
  minWidth: 0,
  width: '100%',
};

export const authorLabel: CSSObject = {
  flex: '0 1 auto',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-bold)',
  lineHeight: 'var(--line-height-sm)',
  color: 'var(--main-color)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
};

export const timestamp: CSSObject = {
  flex: '0 0 auto',
  fontSize: 'var(--font-size-xsmall)',
  lineHeight: 'var(--line-height-xs)',
  color: 'var(--text-input-placeholder)',
  whiteSpace: 'nowrap',
};

export const preview: CSSObject = {
  display: 'block',
  width: '100%',
  minWidth: 0,
  overflow: 'hidden',
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-base)',
  lineHeight: 'var(--line-height-md)',
  textAlign: 'left',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const meta: CSSObject = {
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  alignSelf: 'stretch',
  justifyContent: 'flex-start',
  gap: '6px',
  minWidth: 0,
  marginTop: '2px',
  fontSize: 'var(--font-size-xsmall)',
  lineHeight: 'var(--line-height-xs)',
  textAlign: 'left',
};

export const lastReplyAvatar: CSSObject = {
  display: 'flex',
  width: `${DIAMETER[META_AVATAR_SIZE]}px`,
  height: `${DIAMETER[META_AVATAR_SIZE]}px`,
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
};

export const replyCount: CSSObject = {
  color: 'var(--accent-color)',
  fontWeight: 'var(--font-weight-regular)',
  whiteSpace: 'nowrap',
};

export const metaSeparator: CSSObject = {
  color: 'var(--text-input-placeholder)',
  whiteSpace: 'nowrap',
};

export const lastReply: CSSObject = {
  color: 'var(--text-input-placeholder)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
};

export {MAIN_AVATAR_SIZE, META_AVATAR_SIZE};

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

export const emptyState: CSSObject = {
  padding: '24px 16px',
  color: 'var(--text-input-placeholder)',
  fontSize: 'var(--font-size-small)',
  textAlign: 'center',
};

export const titleIcon: CSSObject = {
  display: 'inline-flex',
  flexShrink: 0,
  marginRight: '6px',
  color: 'var(--main-color)',

  svg: {
    fill: 'currentColor',
  },
};
