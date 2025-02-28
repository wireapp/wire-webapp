/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

export const overlayStyles: CSSObject = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  position: 'absolute',
  top: 0,
  left: 0,
  backgroundColor: 'var(--app-bg)',
  opacity: 0,
  zIndex: 'var(--z-index-modal)',
  transition: 'opacity var(--animation-timing-fast) var(--ease-out-quart)',
  pointerEvents: 'none',
  userSelect: 'none',

  '&::before': {
    content: '""',
    position: 'absolute',
    top: '16px',
    left: '16px',
    width: 'calc(100% - 32px)',
    height: 'calc(100% - 32px)',
    border: '2px dashed var(--border-color)',
    borderRadius: '8px',
  },
};

export const overlayActiveStyles: CSSObject = {
  ...overlayStyles,
  opacity: 1,
  transition: 'opacity var(--animation-timing-fast) var(--ease-in-quad)',
  pointerEvents: 'auto',
};

export const titleStyles: CSSObject = {
  fontSize: 'var(--font-size-base)',
  fontWeight: 'var(--font-weight-semibold)',
  marginBottom: '4px',
};

export const descriptionStyles: CSSObject = {
  fontSize: 'var(--font-size-small)',
};

export const iconStyles: CSSObject = {
  transform: 'rotate(180deg)',
  marginBottom: '16px',
};
