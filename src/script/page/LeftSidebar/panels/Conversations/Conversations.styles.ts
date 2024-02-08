/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

const commonIconStyles: CSSObject = {
  top: '50%',
  position: 'absolute',
  transform: 'translateY(-50%)',
};

export const searchIconStyles: CSSObject = {
  ...commonIconStyles,
  left: 10,
};

export const closeIconStyles: CSSObject = {
  ...commonIconStyles,
  right: 10,
};

export const searchInputStyles: CSSObject = {
  height: '32px',
  borderRadius: 8,
  paddingLeft: 36,
};

export const searchInputWrapperStyles: CSSObject = {
  marginBottom: 12,
  marginTop: 12,
  paddingLeft: 16,
  paddingRight: 16,
  zIndex: 1,
  position: 'relative',
};
