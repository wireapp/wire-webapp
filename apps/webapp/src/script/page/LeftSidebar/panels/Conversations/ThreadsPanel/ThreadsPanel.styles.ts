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
 */

import {CSSObject} from '@emotion/react';

const withAccentShade = (accentColor: string | undefined, shade: string) => {
  if (!accentColor) {
    return undefined;
  }

  return accentColor.replace(/-([0-9]{2,3})\)$/, `-${shade})`);
};

export const panelContainer: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  height: '100%',
  minHeight: 0,
  padding: 0,
};

export const filtersContainer: CSSObject = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  padding: '4px 8px 2px',
};

export const filterButton = (isActive: boolean): CSSObject => ({
  border: 'none',
  backgroundColor: isActive ? 'var(--list-item-selected-bg)' : 'transparent',
  color: isActive ? 'var(--app-bg-secondary)' : 'var(--main-color)',
  borderRadius: '999px',
  padding: '4px 10px',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-xs)',
  transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
  ':hover': {
    backgroundColor: isActive ? 'var(--list-item-selected-bg)' : 'var(--background-fade-8)',
    color: isActive ? 'var(--app-bg-secondary)' : 'var(--main-color)',
  },
  ':focus-visible': {
    outline: '2px solid var(--accent-color)',
    outlineOffset: '2px',
  },
});

export const resetFiltersButton: CSSObject = {
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--accent-color)',
  padding: '4px 2px',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-xs)',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  cursor: 'pointer',
};

export const list: CSSObject = {
  margin: 0,
  padding: '0 8px',
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  overflowY: 'auto',
  minHeight: 0,
};

export const listItem = (isUnread: boolean, accentColor?: string): CSSObject => ({
  border: `1px solid ${isUnread ? withAccentShade(accentColor, '300') ?? 'var(--accent-color-300)' : 'var(--border-color)'}`,
  borderRadius: '12px',
  backgroundColor: isUnread ? withAccentShade(accentColor, '50') ?? 'var(--accent-color-50)' : 'var(--app-bg)',
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  boxShadow: isUnread ? `inset 3px 0 0 ${accentColor ?? 'var(--accent-color-500)'}` : 'none',
});

export const openButton: CSSObject = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  width: '100%',
  border: 'none',
  background: 'none',
  padding: 0,
  textAlign: 'left',
  color: 'inherit',
  cursor: 'pointer',
  ':focus-visible': {
    outline: '2px solid var(--accent-color)',
    outlineOffset: '2px',
    borderRadius: '8px',
  },
};

export const avatarWrapper: CSSObject = {
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  marginTop: '1px',
};

export const avatarPlaceholder: CSSObject = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  backgroundColor: 'var(--background-fade-16)',
  border: '1px solid var(--border-color)',
};

export const content: CSSObject = {
  minWidth: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

export const itemHeader: CSSObject = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
};

export const conversationLabel = (accentColor?: string): CSSObject => ({
  fontSize: 'var(--font-size-small)',
  color: accentColor ?? 'var(--text-input-label)',
  fontWeight: accentColor ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const timestamp: CSSObject = {
  fontSize: 'var(--font-size-small)',
  color: 'var(--text-input-placeholder)',
  whiteSpace: 'nowrap',
  flex: '0 0 auto',
};

export const title = (isUnread: boolean): CSSObject => ({
  fontWeight: isUnread ? 'var(--font-weight-bold)' : 'var(--font-weight-semibold)',
  fontSize: 'var(--font-size-medium)',
  color: 'var(--foreground)',
  lineHeight: 'var(--line-height-md)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const meta: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  flexWrap: 'wrap',
  paddingLeft: '34px',
};

export const authorLabel = (accentColor?: string): CSSObject => ({
  fontSize: 'var(--font-size-small)',
  color: accentColor ?? 'var(--text-input-label)',
  fontWeight: 'var(--font-weight-semibold)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const preview: CSSObject = {
  margin: 0,
  fontSize: 'var(--font-size-small)',
  color: 'var(--foreground)',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  lineHeight: 'var(--line-height-sm)',
  paddingLeft: '34px',
};

export const badges: CSSObject = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
};

export const badge = (kind: 'reply' | 'unread' | 'mention', accentColor?: string): CSSObject => ({
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: '999px',
  padding: '2px 8px',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-xs)',
  border: `1px solid ${
    kind === 'mention'
      ? 'var(--amber-500)'
      : kind === 'unread'
        ? accentColor ?? 'var(--accent-color-500)'
        : 'var(--background-fade-24)'
  }`,
  color:
    kind === 'mention' ? 'var(--amber-500)' : kind === 'unread' ? accentColor ?? 'var(--accent-color)' : 'var(--text-input-label)',
  backgroundColor:
    kind === 'mention'
      ? 'var(--amber-50)'
      : kind === 'unread'
        ? withAccentShade(accentColor, '50') ?? 'var(--accent-color-50)'
        : 'var(--background-fade-8)',
});

export const emptyState: CSSObject = {
  marginTop: '12px',
  border: '1px dashed var(--border-color)',
  borderRadius: '10px',
  padding: '16px 12px',
  textAlign: 'center',
};

export const activeFiltersText: CSSObject = {
  margin: 0,
  padding: '0 10px',
  color: 'var(--text-input-placeholder)',
  fontSize: 'var(--font-size-small)',
};

export const summaryText: CSSObject = {
  margin: 0,
  padding: '0 10px',
  color: 'var(--text-input-label)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
};
