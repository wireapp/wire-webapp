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

export const tagWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  maxWidth: '100px',
  minWidth: 0,
};

export const tagCountStyles: CSSObject = {
  color: 'gray',
  flexShrink: 0,
};

export const tagListStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  maxWidth: '200px',
  maxHeight: '200px',
  overflowY: 'auto',
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

export const tagListItemStyles: CSSObject = {
  flexShrink: 0,
};
