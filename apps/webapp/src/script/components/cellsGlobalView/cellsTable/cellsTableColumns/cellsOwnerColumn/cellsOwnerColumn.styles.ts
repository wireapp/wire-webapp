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

import {ellipsis} from '@wireapp/react-ui-kit';

import {styleBreakpoint} from '../../../common/styleBreakpoint/styleBreakpoint';

export const wrapperStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  maxWidth: '100%',
  transform: 'translateY(4px)',

  [`@media (min-width: ${styleBreakpoint}px)`]: {
    display: 'flex',
    transform: 'translateY(0)',
  },
};

export const avatarWrapperStyles: CSSObject = {
  flexShrink: 0,
  width: '16px',
  height: '16px',
};

export const textStyles: CSSObject = {
  ...ellipsis(),
  display: 'block',
};
