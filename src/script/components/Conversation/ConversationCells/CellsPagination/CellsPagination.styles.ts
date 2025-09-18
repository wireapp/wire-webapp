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

export const containerStyles: CSSObject = {
  marginTop: '20px',
  alignItems: 'center',
  fontSize: 'var(--font-size-medium)',
  padding: '0 8px',
};

export const pagesContainerStyles: CSSObject = {
  alignItems: 'center',
};

export const previousPageStyles: CSSObject = {
  flexBasis: '100%',
};

export const listPagesStyles: CSSObject = {
  alignItems: 'flex-end',
  display: 'flex',
  flexDirection: 'row',
  margin: '0 auto',
};

export const nextPageStyles: CSSObject = {
  display: 'flex',
  flexBasis: 100,
  justifyContent: 'flex-end',
};

export const arrowButtonStyles: CSSObject = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  margin: '4px',
};

export const arrowPreviousIconStyles: CSSObject = {
  height: '32px',
  path: {
    fill: 'var(--main-color)',
  },
  marginTop: '2px',
  marginRight: '3px',
  rotate: '180deg',
};

export const arrowPreviousIconDisabledStyles: CSSObject = {
  ...arrowPreviousIconStyles,
  path: {
    fill: 'var(--disabled-call-button-svg)',
  },
};

export const arrowNextIconStyles: CSSObject = {
  height: '32px',
  path: {
    fill: 'var(--main-color)',
  },
  marginBottom: '2px',
};

export const arrowNextIconDisabledStyles: CSSObject = {
  ...arrowNextIconStyles,
  path: {
    fill: 'var(--disabled-call-button-svg)',
  },
};

export const pageResultStyles: CSSObject = {
  flex: 1,
};
