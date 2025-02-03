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

export const buttonStyles: CSSObject = {
  alignItems: 'center',
  backgroundColor: 'var(--app-bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '100%',
  display: 'flex',
  height: '24px',
  justifyContent: 'center',
  position: 'absolute',
  right: '-12px',
  top: '-12px',
  width: '24px',

  '&:focus, &:hover': {
    backgroundColor: 'var(--gray-20)',
    borderColor: 'var(--gray-40)',

    'body.theme-dark &': {
      backgroundColor: 'var(--gray-80)',
      borderColor: 'var(--gray-70)',
    },
  },
};
