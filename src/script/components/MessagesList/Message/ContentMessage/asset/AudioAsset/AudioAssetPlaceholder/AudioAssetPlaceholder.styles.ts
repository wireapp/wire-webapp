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
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  overflow: 'hidden',
  gap: '8px',
};

export const buttonStyles: CSSObject = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: 'var(--icon-button-primary-disabled-bg)',
  border: '1px solid var(--icon-button-primary-disabled-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  cursor: 'not-allowed',

  '& svg': {
    fill: 'var(--gray-70)',
  },

  'body.dark &': {
    '& svg': {
      fill: 'var(--gray-60)',
    },
  },
};

export const seekBarStyles: CSSObject = {
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const timerWrapperStyles: CSSObject = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
};

export const timerWrapperStylesWithLoading: CSSObject = {
  ...timerWrapperStyles,
  paddingRight: '16px',
};

export const timeStyles: CSSObject = {
  margin: 0,
  fontSize: 'var(--font-size-xsmall)',
  fontWeight: 'var(--font-weight-regular)',
  color: 'var(--foreground)',
};
