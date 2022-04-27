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

export const getLabelCSS = (disabled?: boolean): CSSObject => ({
  '&:hover': {
    cursor: !disabled && 'pointer',
  },
  '&:hover svg': {
    borderColor: !disabled && 'var(--accent-color-500)',
  },
  alignItems: 'center',
  display: 'flex',
  fontSize: '',
});

export const getInputCSS = (isChecked: boolean, disabled?: boolean): CSSObject => ({
  '&:active + svg': {
    borderColor: !disabled && 'var(--accent-color-500)',
  },
  '&:focus + svg, &:focus-visible + svg': {
    backgroundColor: isChecked && 'var(--accent-color-600)',
    borderColor: 'var(--accent-color-600)',
    outline: '1px solid var(--accent-color-700)',
  },
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
});

export const getInputCSSDark = (isChecked: boolean, disabled?: boolean): CSSObject => ({
  'body.theme-dark .input-dark': {
    '& + svg': {
      ...(isChecked && {
        background: 'var(--accent-color-600)',
        borderColor: 'var(--accent-color-600)',
      }),
    },
    '&:active + svg': {
      borderColor: !disabled && 'var(--accent-color-600)',
    },
    '&:focus + svg, &:focus-visible + svg': {
      backgroundColor: isChecked && 'var(--accent-color-700)',
      borderColor: 'var(--accent-color-700)',
      outline: '1px solid var(--accent-color-700)',
    },
  },
});

export const getSvgCSS = (isChecked: boolean, disabled?: boolean): CSSObject => ({
  background: 'var(--checkbox-background)',
  border: '1.5px var(--checkbox-border) solid',
  borderRadius: 3,

  // set to `inline-block` as `inline elements ignore `height` and `width`
  display: 'inline-block',
  height: 20,
  marginRight: 8,
  width: 20,
  ...(isChecked && {
    background: 'var(--accent-color-500)',
    borderColor: 'var(--accent-color-500)',
  }),
  ...(disabled && {
    background: isChecked ? 'var(--checkbox-background-disabled-selected)' : 'var(--checkbox-background-disabled)',
    borderColor: 'var(--checkbox-border-disabled)',
    pointerEvents: 'none',
  }),
});
