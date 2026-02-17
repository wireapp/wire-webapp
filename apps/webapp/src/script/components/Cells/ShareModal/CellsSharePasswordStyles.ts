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

export const passwordContentStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '12px',
};

export const passwordInputRowStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gridTemplateRows: 'auto auto',
  alignItems: 'center',
  columnGap: '12px',
  rowGap: '8px',
  width: '100%',
};

export const passwordInputLabelStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-regular)',
  color: 'var(--main-color)',
  gridColumn: 1,
  gridRow: 1,
};

export const passwordInputStyles: CSSObject = {
  marginBottom: '0',
  flex: 1,
  minWidth: 0,
  gridColumn: 1,
  gridRow: 2,
};

export const passwordActionButtonStyles: CSSObject = {
  alignSelf: 'flex-start',
  '& button': {
    backgroundColor: 'var(--white)',
    marginBottom: 0,
    whiteSpace: 'nowrap',
    overflow: 'visible',
    textOverflow: 'clip',
  },
  'body.theme-dark & button': {
    backgroundColor: 'var(--gray-90)',
  },
};

export const passwordCopyButtonStyles: CSSObject = {
  alignSelf: 'center',
  gridColumn: 2,
  gridRow: 2,
  '& button': {
    backgroundColor: 'var(--white)',
    borderRadius: '12px',
    border: '1px solid var(--gray-40)',
    color: 'var(--main-color)',
    cursor: 'pointer',
    marginBottom: 0,
    whiteSpace: 'nowrap',
    overflow: 'visible',
    textOverflow: 'clip',
    '& svg path': {
      fill: 'currentColor',
    },
    '&:hover, &:focus': {
      backgroundColor: 'var(--gray-20)',
      borderColor: 'var(--gray-50)',
    },
  },
  'body.theme-dark & button': {
    backgroundColor: 'var(--gray-90)',
    border: '1px solid var(--gray-100)',
    color: 'var(--white)',
    '&:hover, &:focus': {
      backgroundColor: 'var(--gray-80)',
      borderColor: 'var(--gray-70)',
    },
  },
};
