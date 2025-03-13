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

export const wrapperStyles: CSSObject = {
  maxWidth: '100%',
  overflowX: 'auto',
};

export const tableStyles: CSSObject = {
  width: '100%',
  borderCollapse: 'collapse',
};

export const headerCellStyles: CSSObject = {
  padding: '12px',
  textAlign: 'left',
  borderBottom: '1px solid var(--gray-70)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-medium)',
  whiteSpace: 'nowrap',

  '@media (max-width: 900px)': {
    display: 'none',
  },
};

export const tableCellStyles: CSSObject = {
  padding: '12px',
  borderBottom: '1px solid var(--border-color)',
  fontSize: 'var(--font-size-small)',
  whiteSpace: 'nowrap',

  '@media (max-width: 900px)': {
    display: 'block',

    '&[data-cell]:before': {
      content: 'attr(data-cell) ": "',
      fontWeight: 'var(--font-weight-semibold)',
    },
  },
};

export const tableCellRow: CSSObject = {
  display: 'block',
  marginBottom: '32px',
  '@media (min-width: 900px)': {
    display: 'table-row',
  },
};
