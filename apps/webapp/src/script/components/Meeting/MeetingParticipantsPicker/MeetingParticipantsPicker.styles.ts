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

import {overlayPortalZIndex} from '@wireapp/react-ui-kit';

export const wrapperStyles: CSSObject = {
  width: '100%',
};

export const controlStyles = ({
  isDisabled,
  isOpen,
  markInvalid,
}: {
  isDisabled: boolean;
  isOpen: boolean;
  markInvalid: boolean;
}): CSSObject => {
  let border: string;
  if (markInvalid) {
    border = '1px solid var(--danger-color)';
  } else if (isOpen) {
    border = '1px solid var(--accent-color)';
  } else {
    border = '1px solid var(--border-color)';
  }

  return {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: isDisabled ? 'var(--background-fadeout)' : 'var(--text-input-background)',
    border,
    borderRadius: '12px',
    boxShadow: 'none',
    cursor: isDisabled ? 'default' : 'text',
    display: 'flex',
    gap: '8px',
    minHeight: '48px',
    outline: 'none',
    padding: '0 8px 0 16px',
    textAlign: 'left',
    width: '100%',
    '&[data-disabled="true"]': {
      backgroundColor: 'var(--background-fadeout)',
      color: 'var(--text-input-placeholder)',
      cursor: 'default',
    },
    '&:focus-within': {
      border: markInvalid ? '1px solid var(--danger-color)' : '1px solid var(--accent-color)',
    },
  };
};

export const searchIconStyles: CSSObject = {
  color: 'var(--text-input-placeholder)',
  flexShrink: 0,
  height: '12px',
  opacity: 0.5,
  width: '12px',
};

export const valueContainerStyles: CSSObject = {
  alignItems: 'center',
  display: 'flex',
  flex: 1,
  gap: '8px',
  minWidth: 0,
  overflow: 'hidden',
};

export const selectedSummaryStyles: CSSObject = {
  color: 'var(--main-color)',
  flexShrink: 0,
  fontSize: 'var(--font-size-medium)',
  lineHeight: '20px',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const searchInputStyles: CSSObject = {
  background: 'transparent',
  border: 'none',
  color: 'var(--main-color)',
  flex: 1,
  fontSize: 'var(--font-size-medium)',
  lineHeight: '20px',
  minWidth: '48px',
  outline: 'none',
  padding: 0,
  width: '100%',
  '&::placeholder': {
    color: 'var(--text-input-placeholder)',
  },
  '&:disabled': {
    cursor: 'default',
  },
};

export const chevronIconStyles = (isOpen: boolean): CSSObject => ({
  flexShrink: 0,
  height: '16px',
  marginTop: isOpen ? 2 : 4,
  transform: isOpen ? 'rotateX(180deg)' : undefined,
  transition: 'transform 0.15s ease',
  width: '16px',
});

export const chevronButtonStyles: CSSObject = {
  alignItems: 'center',
  background: 'none',
  border: 'none',
  color: 'var(--main-color)',
  cursor: 'pointer',
  display: 'flex',
  flexShrink: 0,
  height: '32px',
  justifyContent: 'center',
  padding: 0,
  width: '32px',
  '&:disabled': {
    cursor: 'default',
    opacity: 0.5,
  },
};

export const popoverStyles: CSSObject = {
  backgroundColor: 'var(--text-input-background)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
  marginTop: '4px',
  maxHeight: '280px',
  overflow: 'hidden',
  width: 'var(--trigger-width)',
};

export const popoverOverlayStyles = {zIndex: overlayPortalZIndex};

export const dialogStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '280px',
  outline: 'none',
};

const sectionHeaderBorderStyles: CSSObject = {
  borderBottom: '1px solid var(--gray-40)',
  'body.theme-dark &': {
    borderBottomColor: 'var(--gray-90)',
  },
};

export const listContainerStyles: CSSObject = {
  flex: 1,
  overflowY: 'auto',

  '[data-uie-name="do-toggle-selected-search-list"]': sectionHeaderBorderStyles,

  '[data-uie-name="do-toggle-search-list"]': {
    ...sectionHeaderBorderStyles,
  },

  '[data-uie-name="do-toggle-selected-search-list"] ~ [data-uie-name="do-toggle-search-list"]': {
    borderTop: '1px solid var(--gray-40)',
    'body.theme-dark &': {
      borderTopColor: 'var(--gray-90)',
    },
  },
};

export const emptyStateStyles: CSSObject = {
  color: 'var(--text-input-placeholder)',
  fontSize: 'var(--font-size-medium)',
  lineHeight: '20px',
  padding: '12px 16px',
};

export const loadingStateStyles: CSSObject = {
  color: 'var(--text-input-placeholder)',
  fontSize: 'var(--font-size-medium)',
  lineHeight: '20px',
  padding: '12px 16px',
};
