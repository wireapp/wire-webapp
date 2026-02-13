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
  bottom: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'var(--gray-20)',
  color: 'var(--main-color)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  padding: '4px',
  borderRadius: '12px',

  'body.theme-dark &': {
    backgroundColor: 'var(--gray-90)',
    color: 'var(--main-color)',
  },
};

export const buttonStyles: CSSObject = {
  marginBottom: '0px',
  color: 'inherit',
};

export const pageNumberStyles: CSSObject = {
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 'var(--font-weight-semibold)',
  flexShrink: 0,
};
