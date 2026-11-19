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

import type {CSSObject} from '@emotion/react';

export const viewerStyles: CSSObject = {
  display: 'flex',
  width: '100%',
  height: '100%',
  minHeight: 0,
  flex: 1,
  flexDirection: 'column',
  backgroundColor: 'var(--app-bg)',
};

export const pageStyles: CSSObject = {
  display: 'flex',
  minHeight: 0,
  flex: 1,
  alignItems: 'flex-start',
  justifyContent: 'center',
  overflow: 'auto',
  padding: '16px',
};

export const pageStatusStyles: CSSObject = {
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  color: 'var(--foreground)',
};

export const controlsStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  minHeight: '48px',
  borderTop: '1px solid var(--border-color)',
  backgroundColor: 'var(--app-bg)',
  color: 'var(--foreground)',

  button: {
    minHeight: '32px',
    padding: '0 12px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--button-border-radius)',
    color: 'var(--foreground)',
    backgroundColor: 'transparent',
    cursor: 'pointer',

    '&:disabled': {
      cursor: 'default',
      opacity: 0.5,
    },
  },
};
