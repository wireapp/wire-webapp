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

export const actionStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

export const statusStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

export const emptyBinButtonStyles: CSSObject = {
  backgroundColor: 'var(--danger-color)',
  border: 'none',
  borderRadius: '16px',
  color: 'var(--text-input-background)',
  fontSize: '14px',
  fontWeight: 700,
  gap: '4px',
  height: '32px',
  lineHeight: '20px',
  marginBottom: 0,
  minWidth: 0,
  padding: '6px 12px',
  '& > svg': {
    fill: 'currentColor',
  },
  '&:hover, &:active': {
    backgroundColor: 'var(--danger-color)',
  },
  '&:focus': {
    backgroundColor: 'var(--danger-color)',
    border: '1px solid var(--accent-color-focus)',
  },
  '&:focus-visible': {
    outline: '2px solid var(--accent-color-focus)',
    outlineOffset: '2px',
  },
  '&:disabled': {
    backgroundColor: 'var(--button-tertiary-disabled-bg)',
    color: 'var(--text-input-placeholder)',
  },
};

export const confirmationContentStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '0 16px 16px',
};

export const confirmationTextStyles: CSSObject = {
  margin: 0,
};
