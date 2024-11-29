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

export const buttonStyles: CSSObject = {
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-medium)',
  lineHeight: 'var(--line-height-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 12px',
  border: '1px solid var(--button-tertiary-border)',
  background: 'var(--button-tertiary-bg)',
  color: 'var(--main-color)',
  height: '32px',

  '&:focus-visible': {
    border: '1px solid var(--accent-color-focus)',
    borderRadius: 0,
    backgroundColor: 'var(--button-tertiary-hover-bg)',
    outline: 'none',
  },

  '&:hover': {
    backgroundColor: 'var(--button-tertiary-hover-bg)',
    border: '1px solid var(--button-tertiary-hover-border)',
  },

  '&:first-of-type': {
    borderRadius: '12px 0 0 12px',
  },

  '&:last-of-type': {
    borderRadius: '0 12px 12px 0',
  },
};

export const buttonActiveStyles: CSSObject = {
  border: '1px solid var(--accent-color-300)',
  background: 'var(--accent-color-highlight)',
  color: 'var(--accent-color)',

  '&:hover': {
    background: 'var(--accent-color-highlight)',
    border: '1px solid var(--accent-color-focus)',
  },

  '& > svg': {
    fill: 'var(--accent-color)',
  },
};
