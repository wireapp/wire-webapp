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

export const filterButton = (isActive: boolean): CSSObject => ({
  background: 'none',
  border: 'none',
  padding: '4px',
  cursor: 'pointer',
  color: isActive ? 'var(--accent-color)' : 'var(--foreground)',
  transition: 'color 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    color: 'var(--accent-color)',
  },
  '&:focus': {
    outline: 'none',
  },
  '& svg': {
    fill: 'currentColor',
  },
});

export const dropdown: CSSObject = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: '4px',
  width: 'max-content',
  padding: '8px 0',
  backgroundColor: 'var(--dropdown-menu-bg)',
  borderRadius: '12px',
  boxShadow: '0 0 1px 0 rgba(0, 0, 0, 0.08), 0 8px 24px 0 rgba(0, 0, 0, 0.16)',
  zIndex: 10,
  overflow: 'hidden',
};

export const dropdownCheckboxItem: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  height: '30px',
  padding: '0 24px',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  whiteSpace: 'nowrap',
  '&:hover': {
    backgroundColor: 'var(--foreground-fade-16)',
  },
};

export const filterButtonWrapper: CSSObject = {
  position: 'relative',
};
