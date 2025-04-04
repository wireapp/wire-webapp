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

import {COLOR} from '@wireapp/react-ui-kit';

export const containerStyles: CSSObject = {
  marginTop: 20,
  alignItems: 'center',
  fontSize: 14,
};
export const pagesContainerStyles: CSSObject = {
  alignItems: 'center',
  '.previous-page': {flexBasis: 100},
  '.list-pages': {
    alignItems: 'flex-end',
    display: 'flex',
    flexDirection: 'row',
    margin: '0 auto',
  },
  '.next-page': {
    display: 'flex',
    flexBasis: 100,
    justifyContent: 'flex-end',
  },
};

export const numberStyles: CSSObject = {
  fontSize: 14,
  display: 'block',
  width: 24,
  height: 24,
  margin: 4,
  textAlign: 'center',
  lineHeight: '24px',
  borderRadius: 8,
};

export const numberActiveStyles: CSSObject = {
  backgroundColor: COLOR.BLUE,
  color: COLOR.WHITE,
};

export const arrowButtonStyles: CSSObject = {
  width: 32,
  height: 32,
  borderRadius: 8,
  margin: 4,
};

export const arrowPreviousIconStyles: CSSObject = {
  height: 32,
  path: {
    fill: 'var(--main-color)',
  },
  marginTop: 2,
  marginRight: 3,
  rotate: '180deg',
};

export const arrowNextIconStyles: CSSObject = {
  height: 32,
  path: {
    fill: 'var(--main-color)',
  },
  marginBottom: 2,
};

export const pageSelectorContainer: CSSObject = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  '.rows-per-page-label': {
    flex: 1,
    textAlign: 'right',
    paddingRight: 10,
  },
};

export const selectorStyles: CSSObject = {
  height: 32,
  minHeight: 32,
  '&>div>div:first-of-type': {
    height: '32px !important',
    minHeight: '32px !important',
  },
};
