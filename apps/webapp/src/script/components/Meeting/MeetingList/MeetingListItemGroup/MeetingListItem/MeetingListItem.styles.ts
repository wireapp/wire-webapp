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

export const itemStyles: CSSObject = {
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'var(--text-input-background)',
  padding: '12px 14px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'var(--border-color)',
  borderTop: 'none',
  borderRadius: 0,

  '&:first-of-type': {
    borderTop: '1px solid var(--border-color)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  '&:last-of-type': {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 0,
  },
};

export const onGoingMeetingStyles: CSSObject = {
  background: 'var(--accent-color-highlight)',
  borderLeftColor: 'var(--accent-color)',
  borderRightColor: 'var(--accent-color)',
  borderBottomColor: 'var(--accent-color)',

  '&:first-of-type': {
    borderTopColor: 'var(--accent-color)',
  },

  // Keep a visible divider where ongoing items meet upcoming items below.
  '&[data-is-ongoing]:has(+ :not([data-is-ongoing]))': {
    borderBottomColor: 'var(--border-color)',
  },
};

export const leftStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

export const titleStyles: CSSObject = {
  fontWeight: 'var(--font-weight-semibold)',
};

export const metaStyles: CSSObject = {
  color: 'var(--secondary-text-color)',
  fontSize: 12,
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
};

export const rightStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

export const calendarIconStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  padding: '7px',
  background: 'var(--app-bg)',
  color: 'var(--main-color)',
  border: '1px solid var(--border-color)',
  borderRadius: 8,
};

export const badgeWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '24px',
  padding: '0 4px',
  background: 'var(--app-bg)',
  color: 'var(--main-color)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  fontWeight: 500,
  marginLeft: '4px',
};
