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

export const iconContainerStyle: CSSObject = {
  padding: 0,
  margin: 0,
  width: '16px',
  border: 0,
  background: 'transparent',
};

export const iconStyles: CSSObject = {
  transform: 'rotate(90deg)',
};

export const contextMenuDangerItemStyles: CSSObject = {
  color: 'var(--danger-color)',
};

export const contextMenuDangerItemIconStyles: CSSObject = {
  fill: 'var(--danger-color)',
};
