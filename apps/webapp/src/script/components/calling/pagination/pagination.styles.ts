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

export const paginationContainerStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

export const paginationDotsContainerStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  height: 22,
  borderRadius: 12,
};

export const dotButtonStyles = (isSmaller: boolean): CSSObject => {
  return {
    display: 'flex',
    justifyContent: 'center',
    minWidth: '12px',
    '&:first-of-type': {
      justifyContent: isSmaller ? 'flex-end' : 'center',
    },
    '&:last-of-type': {
      justifyContent: isSmaller ? 'flex-start' : 'center',
    },
  };
};

export const dotStyles = (isActive: boolean, isSmaller: boolean): CSSObject => {
  return {
    borderRadius: '50%',
    '&:active': {
      backgroundColor: isActive ? 'var(--accent-color)' : 'var(--toggle-button-unselected-bg)',
      border: '1px solid var(--accent-color)',
    },
    backgroundColor: isActive ? 'var(--accent-color)' : 'transparent',
    border: isActive ? 'solid 1px var(--accent-color)' : 'solid 1px var(--foreground)',
    width: isSmaller ? '8px' : '12px',
    height: isSmaller ? '8px' : '12px',
  };
};

export const iconButtonStyles: CSSObject = {
  marginBottom: 0,
};

export const chevronLeftStyles: CSSObject = {
  transform: 'rotateY(180deg)',
  height: '16px',
  width: '16px',
};

export const chevronRightStyles: CSSObject = {
  height: '16px',
  width: '16px',
};
