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

export const selectionBarStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: '48px',
  padding: '8px 16px',
  marginBottom: '16px',
  borderRadius: '8px',
  backgroundColor: 'var(--accent-color-fade-16)',
  color: 'var(--main-color)',
};

export const selectionCountStyles: CSSObject = {
  fontWeight: 'var(--font-weight-semibold)',
};

export const clearButtonStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  padding: 0,
  border: 0,
  borderRadius: '50%',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',

  '&:hover, &:focus-visible': {
    backgroundColor: 'var(--foreground-fade-8)',
  },
};
