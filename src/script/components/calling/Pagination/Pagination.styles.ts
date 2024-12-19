/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

export const paginationWrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

export const paginationButtonStyles: CSSObject = {
  ['& svg > path']: {
    fill: 'var(--main-color)',
  },
  ['&:focus-visible']: {
    ['& svg > path']: {
      fill: 'var(--accent-color)',
    },
    outline: '1px solid var(--accent-color-focus)',
  },
  ['&:not([disabled]):hover svg > path']: {
    fill: 'var(--accent-color)',
  },
  ['&:disabled svg > path']: {
    fill: 'var(--disabled-call-button-svg)',
  },
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  height: '100%',
};
