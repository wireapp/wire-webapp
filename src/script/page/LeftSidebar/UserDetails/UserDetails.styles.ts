/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {CSS_SQUARE} from 'Util/CSSMixin';

export const wrapper: CSSObject = {
  marginBottom: '32px',
};

export const userDetailsWrapper: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '2px',
  gap: '10px',
};

export const userDetails: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
};

export const iconStyles: CSSObject = {
  ...CSS_SQUARE(10),
  fill: 'currentColor',
  margin: '0 6px 1px 0',
  minWidth: 10,
  stroke: 'currentColor',
};

export const userName: CSSObject = {
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-md)',

  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

export const userFullName: CSSObject = {
  background: 'transparent',
  border: 'none',
  padding: 0,

  color: 'var(--main-color)',
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-md)',

  marginRight: '4px',

  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  alignItems: 'center',
};

export const userHandle: CSSObject = {
  color: 'var(--text-input-placeholder)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-regular)',
  lineHeight: 'var(--line-height-md)',
};

export const legalHold: CSSObject = {
  flex: '1 0 auto',

  '.legal-hold-dot-button': {
    padding: 0,
  },

  '.legal-hold-dot--text': {
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-regular)',
    lineHeight: 'var(--line-height-md)',
  },
};
