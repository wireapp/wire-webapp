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
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0',
  margin: '0',
  width: '100%',

  '@media (min-width: 900px)': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '32px',
    height: '32px',
    marginLeft: 'auto',
  },
};

export const iconStyles: CSSObject = {
  fill: 'var(--main-color)',
  display: 'none',
  '@media (min-width: 900px)': {
    display: 'block',
  },
};

export const textStyles: CSSObject = {
  display: 'block',
  textAlign: 'center',
  fontWeight: 'var(--font-weight-semibold)',

  '@media (min-width: 900px)': {
    display: 'none',
  },
};
