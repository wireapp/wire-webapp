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

export const conversationsSpacerStyles = (mdBreakpoint: Boolean): CSSObject => ({
  minWidth: mdBreakpoint ? '64px' : '0',
});

export const conversationsSidebarStyles = (mdBreakpoint: Boolean): CSSObject => ({
  position: mdBreakpoint ? 'absolute' : 'relative',
  zIndex: mdBreakpoint ? '1000' : 'auto',
});

export const conversationsSidebarHandleStyles = (isSidebarOpen: Boolean): CSSObject => ({
  position: 'absolute',
  zIndex: '1000',
  top: '8px',
  right: '-12px',
  width: '24px',
  height: '24px',
  borderWidth: '2px',
  display: 'none',
  transform: isSidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  '&:hover': {
    borderColor: 'var(--accent-color-300)',
    backgroundColor: 'var(--accent-color-50)',
    'body.theme-default &': {
      '& svg': {fill: 'var(--accent-color)'},
    },
    'body.theme-dark &': {
      borderColor: 'var(--accent-color-800)',
      backgroundColor: 'var(--accent-color-800)',
    },
  },
  '&:focus': {
    borderColor: 'var(--accent-color)',
  },
});

export const conversationsSidebarHandleIconStyles: CSSObject = {
  marginLeft: '1px',
  width: '12px',
  height: '12px',
};
