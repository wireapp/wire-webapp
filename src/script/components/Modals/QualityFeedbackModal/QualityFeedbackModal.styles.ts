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

export const wrapper: CSSObject = {
  padding: '32px 24px',
};

export const title: CSSObject = {
  fontSize: 'var(--line-height-lg)',
  marginBottom: '16px',
  textAlign: 'center',
};

export const description: CSSObject = {
  fontSize: 'var(--font-size-base)',
  marginBottom: '32px',
  textAlign: 'center',
};

export const ratingList: CSSObject = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: '10px',
  listStyle: 'none',
  margin: '0 0 24px',
  padding: 0,
};

export const ratingItemHeading: CSSObject = {
  color: 'var(--foreground)',
  fontSize: 'var(--font-size-small)',
  marginBottom: '8px',
  textAlign: 'center',
};

export const ratingItemBubble: CSSObject = {
  display: 'grid',
  placeContent: 'center',
  height: '56px',
  width: '56px',

  borderRadius: '50%',

  fontSize: 'var(--font-size-base)',
  fontWeight: 'var(--font-weight-semibold)',
};

export const buttonWrapper: CSSObject = {
  marginBottom: '32px',
};

export const buttonStyle: CSSObject = {
  fontSize: 'var(--font-size-base)',
  fontWeight: 'var(--font-weight-semibold)',
  height: '56px',
  width: '100%',
};
