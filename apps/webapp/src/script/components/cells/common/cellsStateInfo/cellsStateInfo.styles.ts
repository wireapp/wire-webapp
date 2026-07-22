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
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column',
  width: '100%',
  paddingTop: '48px',
};

export const searchStateWrapperStyles: CSSObject = {
  ...wrapperStyles,
};

export const searchWrapperStyles: CSSObject = {
  display: 'flex',
  width: '272px',
  maxWidth: '100%',
  padding: '8px 0',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
};

export const searchIconStyles: CSSObject = {
  width: '16px',
  height: '16px',
  color: 'var(--main-color)',
  flexShrink: 0,
};

export const searchTextWrapperStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
};

export const headingStyles: CSSObject = {
  color: 'var(--main-color)',
  fontWeight: 'var(--font-weight-semibold)',
  fontSize: 'var(--font-size-base)',
  marginBottom: '8px',
};

export const searchHeadingStyles: CSSObject = {
  ...headingStyles,
  marginBottom: '0',
};

export const paragraphStyles: CSSObject = {
  color: 'var(--main-color)',
  fontWeight: 'var(--font-weight-regular)',
  marginBottom: '8px',
  maxWidth: '260px',
  textAlign: 'center',
};

export const searchParagraphStyles: CSSObject = {
  ...paragraphStyles,
  marginBottom: '0',
};
