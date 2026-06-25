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

export const radioInputStyles = (isDisabled: boolean): CSSObject => ({
  position: 'absolute',
  opacity: 0,

  ['&[type="radio"]:checked + label::before']: {
    borderWidth: '6px',
    borderColor: isDisabled ? 'var(--checkbox-background-disabled-selected)' : 'var(--accent-color-500)',
  },

  ['&[type="radio"]:hover + label::before']: {
    borderColor: isDisabled ? '' : 'var(--accent-color-500)',
  },

  [' &[type="radio"]:focus-visible + label::before']: {
    borderColor: isDisabled ? '' : 'var(--accent-color-600)',
  },
});

export const radioLabelStyles = (isDisabled: boolean): CSSObject => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  color: isDisabled ? 'var(--text-input-placeholder)' : 'var(--main-color)',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'pre',
  fontSize: '1rem',

  ['&::before, &::after']: {
    boxSizing: 'border-box',
    borderRadius: '50%',
    marginRight: '6px',
    content: '""',
  },

  ['&::before']: {
    width: '22px',
    height: '22px',
    border: '2px solid',
    borderColor: isDisabled ? 'var(--checkbox-background-disabled-selected)' : 'var(--checkbox-border)',
    background: 'var(--app-bg)',
    transition: 'all 0.15s',
  },
});

export const radioOptionStyles: CSSObject = {
  marginBottom: '1rem',
  position: 'relative',
  ['&:last-child']: {
    marginBottom: 0,
  },
};

export const radioHintStyles: CSSObject = {
  color: 'var(--foreground)',
};

export const radioOptionHorizontalStyles: CSSObject = {
  display: 'flex',
  gap: '1rem',
};
