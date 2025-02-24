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
  justifyContent: 'flex-end',
  flexDirection: 'column',
  paddingBottom: '96px',
  position: 'absolute',
  top: 0,
  left: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  opacity: 0,
  gap: '16px',
  zIndex: 'var(--z-index-modal)',
  transition: 'opacity var(--animation-timing-fast) var(--ease-out-quart)',
  pointerEvents: 'none',
  userSelect: 'none',
};

export const overlayActiveStyles: CSSObject = {
  ...overlayStyles,
  opacity: 0.8,
  transition: 'opacity var(--animation-timing-fast) var(--ease-in-quad)',
  pointerEvents: 'auto',
};

export const textStyles: CSSObject = {
  color: 'var(--white)',
  fontSize: 'var(--font-size-small)',
};

export const iconStyles: CSSObject = {
  fill: 'var(--white)',
  transform: 'rotate(180deg)',
};
