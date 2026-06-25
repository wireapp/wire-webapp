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

export const containerStyles = (sidebarOpen: boolean): CSSObject => ({
  cursor: 'pointer',
  padding: '2px',
  width: '120px',
  marginBottom: '4px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  opacity: sidebarOpen ? 1 : 0,
  transition: 'opacity 0.2s var(--ease-in-out-quart)',
  gap: '4px',
  height: '160px',
});

export const thumbnailWrapperStyles = (isActive: boolean): CSSObject => ({
  border: isActive ? '2px solid var(--accent-color)' : '2px solid transparent',
});

export const pageNumberStyle: CSSObject = {
  fontSize: '11px',
  color: '#666',
  marginBottom: '2px',
};
