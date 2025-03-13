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
  width: '100%',
};

export const tabListStyles: CSSObject = {
  display: 'flex',
  borderBottom: '1px solid var(--border-color)',
  marginBottom: '1rem',
  paddingLeft: '16px',
  gap: '24px',
};

export const tabButtonStyles = (isActive: boolean): CSSObject => ({
  position: 'relative',
  padding: '8px 2px',
  margin: 0,
  border: '2px solid transparent',
  background: 'none',
  cursor: 'pointer',
  fontSize: 'var(--font-size-medium)',
  color: 'var(--text-input-placeholder)',
  transition: 'all 0.2s ease',

  '&:focus': {
    outline: 'none',
  },

  ...(isActive && {
    '&:after': {
      content: '""',
      position: 'absolute',
      bottom: '-2px',
      left: 0,
      display: 'block',
      width: '100%',
      height: '2px',
      background: 'var(--accent-color)',
    },
  }),
});

export const tabButtonFocusStyles: CSSObject = {
  '&:focus .focus-ring': {
    borderColor: 'var(--accent-color)',
  },
};

export const tabPanelStyles: CSSObject = {
  padding: '1rem',
  borderTop: 'none',
  minHeight: '200px',

  '&.is-hidden': {
    display: 'none',
  },
};
