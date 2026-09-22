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

import {styleBreakpoint} from '../../../common/styleBreakpoint/styleBreakpoint';

export const buttonStyles: CSSObject = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  margin: '0',
  width: '100%',
  padding: '12px 0',
  borderRadius: '0',

  '&:hover, &:focus-visible': {
    backgroundColor: 'var(--foreground-fade-8)',
  },

  [`@media (min-width: ${styleBreakpoint}px)`]: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    padding: '0',
    borderRadius: '8px',
  },
};

export const iconStyles: CSSObject = {
  fill: 'var(--main-color)',
  display: 'none',
  [`@media (min-width: ${styleBreakpoint}px)`]: {
    display: 'block',
  },
};

export const textStyles: CSSObject = {
  display: 'block',
  textAlign: 'center',
  fontWeight: 'var(--font-weight-semibold)',

  [`@media (min-width: ${styleBreakpoint}px)`]: {
    display: 'none',
  },
};
