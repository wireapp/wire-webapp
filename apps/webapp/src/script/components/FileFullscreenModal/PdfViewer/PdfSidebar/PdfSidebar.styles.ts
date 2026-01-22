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

export const wrapperStyles = (isOpen: boolean): CSSObject => ({
  width: isOpen ? '200px' : '0',
  overflowY: 'auto',
  borderRight: '1px solid var(--border-color)',
  padding: '8px 4px',
  height: '100%',
  transition: 'all 0.3s var(--ease-out-quart)',
  opacity: isOpen ? 1 : 0,
  visibility: isOpen ? 'visible' : 'hidden',
});

export const listStyles: CSSObject = {
  width: '100%',
  position: 'relative',
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

export const listItemStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
};
