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

export const contentWrapperStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  backgroundColor: 'var(--foreground-fade-8)',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  color: 'var(--gray-70)',
  aspectRatio: '16/9',
  overflow: 'hidden',
  padding: 0,
  margin: 0,
  cursor: 'pointer',

  // Fallback for the above aspect-ratio
  '@supports not (aspect-ratio: 16/9)': {
    paddingBottom: '56.25%',
  },
};

export const imageStyles: CSSObject = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'top',
  opacity: 'var(--opacity)',
};

export const infoOverlayStyles: CSSObject = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  userSelect: 'none',
  pointerEvents: 'none',
};

export const infoWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
};

export const loaderIconStyles: CSSObject = {
  color: 'var(--gray-70)',
  fontSize: 'var(--font-size-medium)',

  'body.theme-dark &': {
    color: 'var(--gray-40)',
  },
};

export const errorIconStyles: CSSObject = {
  flexShrink: 0,
  marginRight: '8px',
  fill: 'var(--gray-70)',

  'body.theme-dark &': {
    fill: 'var(--gray-40)',
  },
};

export const errorTextStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--line-height-md)',
  lineHeight: 'var(--line-height-sm)',
  color: 'var(--main-color)',
};

export const moreButtonStyles: CSSObject = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0',
  marginLeft: 'auto',
  zIndex: '1',
};

export const moreIconStyles: CSSObject = {
  fill: 'var(--main-color)',
  display: 'block',
};
