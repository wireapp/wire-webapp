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

import {COLOR_V2} from '../../../Identity/colors-v2/colors-v2';

export const listItemStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
};

export const buttonStyles: CSSObject = {
  background: 'none',
  border: 'none',
  padding: '0 8px',
  cursor: 'pointer',
  fontSize: '14px',
  color: COLOR_V2.GRAY_70,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',

  '&:hover': {
    color: 'var(--main-color)',
  },
};

export const activeItemStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '0 8px',
  fontSize: '14px',
  color: 'var(--main-color)',
};
