/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

export const warningOptionStyles: CSSObject = {
  '&&': {
    padding: '12px 16px',
    margin: '20px 0 0',
    border: '1px solid #ead79b',
    borderRadius: '8px',
    backgroundColor: '#fff8df',
    color: '#665016',
    '.label-xs': {
      fontSize: '12px',
      lineHeight: '18px',
      fontWeight: 400,
    },
    'body.theme-dark &': {
      backgroundColor: '#332b18',
      borderColor: '#665326',
      color: '#f0d999',
    },
  },
};
