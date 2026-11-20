/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {CSSObject} from '@emotion/react';

export const wrapperStyles: CSSObject = {
  position: 'absolute',
  top: '50%',
  right: '4px',
  zIndex: 1,
  transform: 'translateY(-50%)',
};

export const triggerStyles: CSSObject = {
  display: 'flex',
  width: '32px',
  height: '32px',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 0,
  borderRadius: '50%',
  backgroundColor: 'transparent',
  color: 'var(--main-color)',
  cursor: 'pointer',

  '&:hover': {
    backgroundColor: 'var(--foreground-fade-16)',
  },

  '&:focus-visible': {
    outline: '2px solid var(--accent-color-focus)',
    outlineOffset: '2px',
  },
};
