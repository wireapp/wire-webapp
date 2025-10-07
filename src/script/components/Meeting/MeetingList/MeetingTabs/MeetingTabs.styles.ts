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

export const tabsWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: 24,
  height: 46,
  margin: '0 16px',
  borderBottom: '1px solid var(--border-color)',
};

export const tabStyles = (active: boolean): CSSObject => ({
  position: 'relative',
  padding: '12px 16px',
  color: active ? 'var(--main-color)' : 'var(--secondary-text-color)',
  fontWeight: 'var(--font-weight-semibold)',
  cursor: 'pointer',
  userSelect: 'none',
  ':after': {
    content: '""',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    background: active ? 'var(--main-color)' : 'transparent',
  },
});
