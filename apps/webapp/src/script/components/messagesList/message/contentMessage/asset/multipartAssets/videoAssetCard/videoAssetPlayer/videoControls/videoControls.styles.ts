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

export const wrapperStyles: CSSObject = {
  position: 'absolute',
  bottom: 0,
  display: 'flex',
  width: '100%',
  height: '56px',
  alignItems: 'center',
  padding: '0 8px',
  color: 'var(--white)',

  '&::before': {
    content: "''",
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
    background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(0,0,0,0.4))',
  },
};

export const timeStyles: CSSObject = {
  fontSize: 'var(--font-size-xsmall)',
  fontWeight: 'var(--font-weight-regular)',
  textAlign: 'center',
  zIndex: 1,
};

export const seekbarStyles: CSSObject = {
  margin: '0 8px',
  zIndex: 1,
};

export const playButtonWrapperStyles: CSSObject = {
  marginRight: '8px',
  zIndex: 1,
};
