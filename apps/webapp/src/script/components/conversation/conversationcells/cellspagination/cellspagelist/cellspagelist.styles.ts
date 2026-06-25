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

export const listStyles: CSSObject = {
  alignItems: 'flex-end',
  display: 'flex',
  flexDirection: 'row',
  margin: '0 auto',
  listStyle: 'none',
  padding: 0,
};

export const numberStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  display: 'block',
  width: '24px',
  height: '24px',
  margin: '4px',
  textAlign: 'center',
  lineHeight: 'var(--line-height-lg)',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
};

export const numberActiveStyles: CSSObject = {
  backgroundColor: 'var(--accent-color)',
  color: 'var(--white)',

  'body.theme--dark &': {
    color: 'var(--main)',
  },
};
