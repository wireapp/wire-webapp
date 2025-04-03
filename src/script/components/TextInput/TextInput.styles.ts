/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

export const getIconCSS = (fill?: string): CSSObject => ({
  alignItems: 'center',
  top: 36,
  fill: fill,
  height: 16,
  margin: 0,
  padding: 0,
  position: 'absolute',
  right: 16,
  width: 16,
});

export const containerCSS: CSSObject = {
  display: 'flex',
  flexDirection: 'column-reverse',
  paddingBottom: '1rem',
  position: 'relative',
  width: '100%',
};

export const errorMessageCSS: CSSObject = {
  color: 'var(--text-input-alert)',
  left: 0,
  lineHeight: 'var(--line-height-small-plus)',
  textTransform: 'unset',
  marginTop: '4px',
  fontWeight: 'normal',
};

export const getInputCSS = (disabled?: boolean, borderColor?: string): CSSObject => ({
  '&::placeholder': {
    color: 'var(--text-input-placeholder)',
  },
  '&:hover': {
    borderColor: !disabled ? 'var(--text-input-border-hover)' : undefined,
  },
  '&:focus, &:focus-visible, &:active': {
    '& + label': {
      color: !disabled ? 'var(--accent-color-500)' : undefined,
    },
    borderColor: !disabled ? 'var(--accent-color-500)' : undefined,
  },
  ':-ms-input-placeholder': {
    // Internet Explorer 10-11
    color: 'var(--text-input-placeholder)',
  },
  '::-ms-input-placeholder': {
    // Microsoft Edge
    color: 'var(--text-input-placeholder)',
  },
  '::placeholder': {
    // Chrome, Firefox, Opera, Safari 10.1+
    color: 'var(--text-input-placeholder)',
    opacity: 1, // Firefox
  },
  background: disabled ? 'var(--text-input-disabled)' : 'var(--text-input-background)',
  border: '1px solid',
  borderColor: borderColor || 'var(--text-input-border)',
  borderRadius: 12,
  color: 'var(--text-input-color)',
  outline: 'none',
  padding: '12px 38px 12px 16px',
  width: '100%',
});

export const getLabelCSS = (color?: string): CSSObject => ({
  color: color || 'var(--text-input-color)',
  fontWeight: 'var(--font-weight-semibold)',
  display: 'flex',
  flexDirection: 'column',
  marginBottom: 2,
});

export const cancelButtonCSS: CSSObject = {
  alignItems: 'center',
  background: 'var(--text-input-color)',
  border: 'none',
  borderRadius: '50%',
  bottom: '2rem',
  display: 'flex',
  height: 16,
  justifyContent: 'center',
  margin: 0,
  padding: 0,
  position: 'absolute',
  right: 16,
  width: 16,
};
