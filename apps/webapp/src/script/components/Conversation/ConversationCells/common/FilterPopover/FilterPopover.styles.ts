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

const outlineBorder = 'var(--Border-Base-Primary, #DCE0E3)';
const surfaceBackground = 'var(--Background-Base-Primary, #FFF)';
const disabledBackground = 'var(--Background-Base-Secondary, #EDEFF0)';
const darkOutlineBorder = 'var(--Border-Base-Primary, #34373D)';
const darkSurfaceBackground = 'var(--Background-Base-Primary, #17181A)';
const darkDisabledBackground = 'var(--Background-Base-Primary, #17181A)';

export const triggerButtonStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '32px',
  padding: '0 10px',
  borderRadius: '12px',
  border: `1px solid ${outlineBorder}`,
  background: surfaceBackground,
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-small-plus)',
  letterSpacing: '0.25px',
  color: 'var(--main-color)',
  cursor: 'pointer',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '&[data-pressed]': {
    border: '1px solid var(--accent-color-500)',
  },
  '&[data-hovered]': {
    border: '1px solid var(--accent-color-500)',
  },
  '&[data-active="true"]': {
    border: '1px solid var(--accent-color-500)',
    background: 'var(--accent-color-highlight)',
    color: 'var(--accent-color-500)',
  },
  '&[data-disabled]': {
    border: `1px solid ${outlineBorder}`,
    background: disabledBackground,
    cursor: 'not-allowed',
  },
  'body.theme-dark &': {
    border: `1px solid ${darkOutlineBorder}`,
    background: darkSurfaceBackground,
    '&[data-pressed], &[data-hovered]': {
      border: '1px solid var(--accent-color-500)',
    },
    '&[data-active="true"]': {
      border: '1px solid var(--accent-color-500)',
      background: 'var(--accent-color-highlight)',
      color: 'var(--accent-color-500)',
    },
    '&[data-disabled]': {
      border: `1px solid ${darkOutlineBorder}`,
      background: darkDisabledBackground,
      color: 'var(--foreground-secondary, #9FA1A7)',
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
  borderRadius: '6px',
  background: 'var(--accent-color-500)',
  color: '#FFF',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
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
  border: `1px solid ${outlineBorder}`,
  background: surfaceBackground,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
  outline: 'none',
  overflow: 'hidden',
  'body.theme-dark &': {
    border: `1px solid ${darkOutlineBorder}`,
    background: darkSurfaceBackground,
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
  height: '32px',
  padding: '0 12px',
  alignItems: 'center',
  gap: '8px',
  margin: '8px 12px',
  borderRadius: '8px',
  border: `1px solid ${outlineBorder}`,
  boxSizing: 'border-box',
  '&:focus-within': {
    border: '1px solid var(--accent-color-500)',
  },
  'body.theme-dark &': {
    border: `1px solid ${darkOutlineBorder}`,
    '&:focus-within': {
      border: '1px solid var(--accent-color-500)',
    },
  },
};

export const searchClearButtonStyles: CSSObject = {
  border: 'none',
  background: 'none',
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  color: 'var(--main-color)',
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
  padding: 0,
  maxHeight: '260px',
  overflowY: 'auto',
  scrollbarGutter: 'stable',
};

export const itemRowHoverStyles: CSSObject = {
  position: 'relative',
  '&:not(:last-child)::after': {
    content: '""',
    display: 'block',
    position: 'absolute',
    bottom: 0,
    left: '12px',
    right: '12px',
    height: '1px',
    background: outlineBorder,
  },
  '&:hover': {
    background: 'var(--Background-Base-Secondary, #F5F6F7)',
  },
  'body.theme-dark &': {
    '&:not(:last-child)::after': {
      background: darkOutlineBorder,
    },
    '&:hover': {
      background: 'var(--Background-Base-Secondary, #212326)',
    },
  },
};

const sharedRowLayout: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '10px 6px',
  gap: '10px',
  cursor: 'pointer',
};

export const checkboxWrapperStyles: CSSObject = {
  ...sharedRowLayout,
  margin: 0,
  left: '0',
  justifyContent: 'space-between',
  '& .wireinput + label::before': {
    minWidth: '18px',
    height: '18px',
  },
  '& .wireinput:not(:checked):not(:disabled) + label::before': {
    borderColor: 'var(--accent-color)',
  },
  '& .wireinput + label > svg': {
    width: '12px',
    height: '11px',
  },
};

export const startContentStyles: CSSObject = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  '& svg': {
    width: '18px',
    height: '22px',
  },
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
  fontSize: 'var(--font-size-medium)',
  lineHeight: '18px',
};

export const footerStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'center',
  padding: '8px 12px',
  borderTop: `1px solid ${outlineBorder}`,
  'body.theme-dark &': {
    borderTop: `1px solid ${darkOutlineBorder}`,
  },
};

export const clearAllButtonStyles: CSSObject = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-regular)',
  lineHeight: 'var(--line-height-small-plus)',
  color: 'var(--main-color)',
  textDecoration: 'underline',
  padding: '2px 4px',
};

export const emptyStateStyles: CSSObject = {
  padding: '12px',
  textAlign: 'center',
  fontSize: '13px',
  color: 'var(--foreground-secondary, #71767B)',
};
