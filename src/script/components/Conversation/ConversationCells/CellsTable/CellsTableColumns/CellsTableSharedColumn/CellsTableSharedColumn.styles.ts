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

import {CSS_VISUALLY_HIDDEN} from 'Util/CSSMixin';

import {styleBreakpoint} from '../../../common/styleBreakpoint/styleBreakpoint';

export const wrapperStyles: CSSObject = {
  display: 'inline',

  [`@media (min-width: ${styleBreakpoint}px)`]: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '10px',
  },
};

export const wrapperStylesHidden: CSSObject = {
  ...wrapperStyles,
  [`@media (min-width: ${styleBreakpoint}px)`]: {
    display: 'none',
  },
};

export const iconWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  backgroundColor: 'var(--gray-30)',
  width: '20px',
  height: '20px',

  'body.theme-dark &': {
    backgroundColor: 'var(--foreground-fade-8)',
  },

  [`@media (max-width: ${styleBreakpoint}px)`]: {
    display: 'none',
  },
};

export const iconStyles: CSSObject = {
  'body.theme-dark &': {
    fill: 'var(--main-color)',
  },
};

export const textStyles: CSSObject = {
  [`@media (min-width: ${styleBreakpoint}px)`]: {
    ...CSS_VISUALLY_HIDDEN,
  },
};
