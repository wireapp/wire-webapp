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

import {CSSObject} from '@emotion/react';

export const triggerButtonStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '32px',
  padding: '0 10px',
  borderRadius: '12px',
  border: '1px solid var(--Border-Base-Primary, #DCE0E3)',
  background: 'var(--Background-Base-Primary, #FFF)',
  fontSize: '14px',
  fontWeight: 400,
  color: 'inherit',
  cursor: 'pointer',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '&[data-pressed]': {
    border: '1px solid var(--Border-Accent-Color-Primary, #0667C8)',
  },
  '&[data-hovered]': {
    border: '1px solid var(--Border-Accent-Color-Primary, #0667C8)',
  },
  'body.theme-dark &': {
    border: '1px solid var(--Border-Base-Primary, #34373D)',
    background: 'var(--Background-Base-Primary, #17181A)',
    '&[data-pressed], &[data-hovered]': {
      border: '1px solid var(--Border-Accent-Color-Primary, #54A6FF)',
    },
  },
};

export const badgeStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '18px',
  height: '18px',
  padding: '0 5px',
  borderRadius: '9px',
  background: 'var(--accent-color, #0667C8)',
  color: '#FFF',
  fontSize: '12px',
  fontWeight: 600,
  lineHeight: 1,
};

export const chevronStyles: CSSObject = {
  width: '10px',
  height: '10px',
  flexShrink: 0,
  opacity: 0.6,
};

export const popoverStyles: CSSObject = {
  width: '260px',
  borderRadius: '12px',
  border: '1px solid var(--Border-Base-Primary, #DCE0E3)',
  background: 'var(--Background-Base-Primary, #FFF)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
  outline: 'none',
  overflow: 'hidden',
  'body.theme-dark &': {
    border: '1px solid var(--Border-Base-Primary, #34373D)',
    background: 'var(--Background-Base-Primary, #17181A)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  },
};

export const dialogStyles: CSSObject = {
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
};

export const searchRowStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 12px',
  borderBottom: '1px solid var(--Border-Base-Primary, #DCE0E3)',
  'body.theme-dark &': {
    borderBottom: '1px solid var(--Border-Base-Primary, #34373D)',
  },
};

export const searchIconStyles: CSSObject = {
  flexShrink: 0,
  width: '12px',
  height: '12px',
  opacity: 0.5,
};

export const searchInputStyles: CSSObject = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: '13px',
  color: 'inherit',
  padding: 0,
  '&::placeholder': {
    color: 'var(--foreground-secondary, #71767B)',
  },
};

export const itemListStyles: CSSObject = {
  listStyle: 'none',
  margin: 0,
  padding: '4px 0',
  maxHeight: '260px',
  overflowY: 'auto',
};

export const itemRowHoverStyles: CSSObject = {
  '&:hover': {
    background: 'var(--Background-Base-Secondary, #F5F6F7)',
  },
  'body.theme-dark &': {
    '&:hover': {
      background: 'var(--Background-Base-Secondary, #212326)',
    },
  },
};

// Shared layout for both checkbox wrapper and single-select button rows
const sharedRowLayout: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '8px 12px',
  gap: '10px',
  cursor: 'pointer',
};

export const checkboxWrapperStyles: CSSObject = {
  ...sharedRowLayout,
  margin: 0,
  justifyContent: 'space-between',
};

export const singleSelectRowStyles: CSSObject = {
  ...sharedRowLayout,
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  color: 'inherit',
};

export const startContentStyles: CSSObject = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
};

export const labelGroupStyles: CSSObject = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

export const checkboxLabelStyles: CSSObject = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '14px',
  cursor: 'pointer',
  lineHeight: '18px',
};

export const subLabelStyles: CSSObject = {
  fontSize: '12px',
  color: 'var(--foreground-secondary, #71767B)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  lineHeight: '16px',
};

export const footerStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'center',
  padding: '8px 12px',
  borderTop: '1px solid var(--Border-Base-Primary, #DCE0E3)',
  'body.theme-dark &': {
    borderTop: '1px solid var(--Border-Base-Primary, #34373D)',
  },
};

export const clearAllButtonStyles: CSSObject = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '13px',
  color: 'var(--accent-color, #0667C8)',
  padding: '2px 4px',
  '&:hover': {
    textDecoration: 'underline',
  },
};

export const emptyStateStyles: CSSObject = {
  padding: '12px',
  textAlign: 'center',
  fontSize: '13px',
  color: 'var(--foreground-secondary, #71767B)',
};
