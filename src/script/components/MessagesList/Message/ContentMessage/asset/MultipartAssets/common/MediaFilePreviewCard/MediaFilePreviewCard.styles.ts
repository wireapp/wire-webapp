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
  width: '76px',
  height: '76px',
  borderRadius: '10px',
  border: '1px solid var(--gray-40)',
  position: 'relative',

  'body.theme-dark &': {
    border: '1px solid transparent',
  },
};

export const wrapperErrorStyles: CSSObject = {
  ...wrapperStyles,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  flexDirection: 'column',
  backgroundColor: 'var(--app-bg-secondary)',
  padding: '8px 8px 6px',

  'body.theme-dark &': {
    backgroundColor: 'var(--foreground-fade-8)',
    border: '1px solid transparent',
  },
};

export const imageStyles: CSSObject = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: '10px',
};

export const loadingWrapperStyles: CSSObject = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: '0',
  margin: '0',
  cursor: 'pointer',
  width: '24px',
  height: '24px',
  background: 'var(--icon-button-primary-enabled-bg)',
  border: '1px solid var(--icon-button-primary-border)',
  borderRadius: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const loadingIconStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  color: 'var(--main)',
};

export const errorIconStyles: CSSObject = {
  flexShrink: 0,
};

export const errorTextStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--line-height-md)',
  lineHeight: 'var(--line-height-sm)',
  color: 'var(--gray-70)',

  'body.dark &': {
    color: 'var(--gray-40)',
  },
};
