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

export const tabsContainer: CSSObject = {
  display: 'flex',
  gap: '8px',
  width: '100%',
  marginTop: '8px',
  marginBottom: '16px',
  overflowX: 'auto',
  flexWrap: 'nowrap',
  scrollbarWidth: 'none',

  '&::-webkit-scrollbar': {
    display: 'none',
  },
};

export const tabButton = (isActive: boolean): CSSObject => ({
  display: 'inline-flex',
  flexShrink: 0,
  alignItems: 'center',
  gap: '6px',
  border: 'none',
  borderRadius: '999px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  backgroundColor: isActive ? 'var(--list-item-selected-bg)' : 'var(--app-bg-secondary)',
  color: isActive ? 'var(--app-bg-secondary)' : 'var(--foreground)',
  transition: 'background-color 0.15s ease, color 0.15s ease',
  '&:hover': {
    backgroundColor: isActive ? 'var(--list-item-selected-bg)' : 'var(--foreground-fade-8)',
  },
});

export const tabBadge = (isActive: boolean): CSSObject => ({
  minWidth: '18px',
  padding: '0 6px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  lineHeight: '18px',
  textAlign: 'center',
  backgroundColor: isActive ? 'rgba(0, 0, 0, 0.25)' : 'var(--foreground)',
  color: 'var(--app-bg-secondary)',
});
