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

const wrapperStyles: CSSObject = {
  backgroundColor: 'var(--app-bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  padding: '8px',
  position: 'relative',

  'body.theme-dark &': {
    backgroundColor: 'var(--foreground-fade-8)',
    border: '1px solid transparent',
  },
};

export const wrapperStylesSmall: CSSObject = {
  ...wrapperStyles,
  height: '74px',
  width: '254px',
};

export const wrapperStylesLarge: CSSObject = {
  ...wrapperStyles,
  height: 'auto',
  maxWidth: '500px',
  width: '100%',
};

export const contentStyles: CSSObject = {
  alignItems: 'flex-start',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '60px',
  justifyContent: 'flex-end',
};
