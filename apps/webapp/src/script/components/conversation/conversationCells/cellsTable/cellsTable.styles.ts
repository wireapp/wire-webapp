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

import {styleBreakpoint} from '../common/styleBreakpoint/styleBreakpoint';

export const wrapperStyles: CSSObject = {
  position: 'relative',
  maxWidth: '100%',
  overflowX: 'auto',
  overflowY: 'auto',
};

export const wrapperWithRowsStyles: CSSObject = {
  marginBottom: 'auto',
};

export const selectionBarContainerStyles: CSSObject = {
  position: 'relative',
  width: '100%',
  height: '42px',
  pointerEvents: 'none',
};

export const moveOutcomeMessageStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  margin: '0 0 12px',
  padding: '12px 16px',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  backgroundColor: 'var(--foreground-fade-8)',
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-small)',
  lineHeight: 1.5,
};

export const selectionBarStyles: CSSObject = {
  position: 'absolute',
  zIndex: 1,
  inset: 0,
  display: 'flex',
  width: '100%',
  minWidth: 0,
  height: '42px',
  alignItems: 'center',
  gap: '8px',
  padding: '0 8px',
  borderRadius: '12px',
  background: 'linear-gradient(var(--accent-color-fade-16), var(--accent-color-fade-16)), var(--modal-bg)',
  color: 'var(--main-color)',
  pointerEvents: 'auto',

  '@media (forced-colors: active)': {
    background: 'Highlight',
    color: 'HighlightText',
  },
};

export const clearSelectionButtonStyles: CSSObject = {
  flexShrink: 0,
  display: 'inline-flex',
  width: '32px',
  height: '32px',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 0,
  borderRadius: '50%',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',

  '&:hover, &:focus-visible': {
    backgroundColor: 'var(--foreground-fade-8)',
  },

  '&:focus-visible': {
    outline: '2px solid currentColor',
    outlineOffset: '2px',
  },
};

export const selectionCountStyles: CSSObject = {
  minWidth: 0,
  overflow: 'hidden',
  fontWeight: 'var(--font-weight-semibold)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const selectionSizeStyles: CSSObject = {
  minWidth: 0,
  maxWidth: '30%',
  overflow: 'hidden',
  color: 'var(--main-color)',
  fontSize: 'var(--font-size-medium)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',

  '@media (forced-colors: active)': {
    color: 'inherit',
  },
};

export const bulkMoveButtonStyles: CSSObject = {
  flexShrink: 0,
  display: 'inline-flex',
  minHeight: '30px',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  marginLeft: 'auto',
  padding: '0 12px',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  background: 'var(--modal-bg)',
  color: 'var(--main-color)',
  cursor: 'pointer',

  '&:hover, &:focus-visible': {
    backgroundColor: 'var(--foreground-fade-8)',
  },

  '&:focus-visible': {
    outline: '2px solid currentColor',
    outlineOffset: '2px',
  },

  '@media (forced-colors: active)': {
    borderColor: 'ButtonText',
    background: 'ButtonFace',
    color: 'ButtonText',
  },
};

export const bulkMoveToBinButtonStyles: CSSObject = {
  ...bulkMoveButtonStyles,
  marginLeft: 0,
  borderColor: 'transparent',
  background: 'var(--danger-color)',
  color: 'var(--main-color)',

  '&:hover, &:focus-visible': {
    background: 'var(--danger-color)',
    opacity: 0.9,
  },
};

export const tableStyles: CSSObject = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',

  [`@media (min-width: ${styleBreakpoint}px)`]: {
    minWidth: '900px',
  },
};

export const headerCellStyles: CSSObject = {
  padding: '8px',
  textAlign: 'left',
  borderBottom: '1px solid var(--gray-70)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-medium)',
  whiteSpace: 'nowrap',
  [`@media (max-width: ${styleBreakpoint}px)`]: {
    display: 'none',
  },
};

export const tableCellStyles: CSSObject = {
  padding: '12px',
  borderBottom: '1px solid var(--border-color)',
  fontSize: 'var(--font-size-small)',
  whiteSpace: 'nowrap',
  width: '100% !important',

  [`@media (max-width: ${styleBreakpoint}px)`]: {
    display: 'block',
    padding: '12px 8px',
    borderBottom: '1px solid var(--border-color)',

    '&[data-cell]': {
      borderBottom: '1px solid var(--border-color)',
      '&:nth-last-of-type(2)': {
        borderBottom: 'none',
      },
    },

    '&[data-cell]:before': {
      content: 'attr(data-cell) ": "',
      fontWeight: 'var(--font-weight-semibold)',
    },
  },
};

export const tableActionsCellStyles: CSSObject = {
  ...tableCellStyles,
  padding: '0',
  [`@media (max-width: ${styleBreakpoint}px)`]: {
    display: 'block',
    background: 'var(--foreground-fade-8)',
    border: 'none',
    marginTop: '8px',
    borderRadius: '0',
    width: '100% !important',
  },
};

export const selectedTableCellRowStyles: CSSObject = {
  backgroundColor: 'var(--accent-color-fade-16)',
  '&[aria-selected="true"]:hover': {
    backgroundColor: 'var(--accent-color-fade-16)',
  },
  'body.theme-dark &[aria-selected="true"]:hover': {
    backgroundColor: 'var(--accent-color-fade-16)',
  },
};

export const tableCellRow: CSSObject = {
  display: 'block',
  borderBottom: '1px solid var(--border-color)',
  borderTop: '1px solid var(--border-color)',

  '&:hover': {
    backgroundColor: 'var(--white)',

    'body.theme-dark &': {
      backgroundColor: 'var(--gray-90)',
    },
  },

  '&:not(:last-of-type)': {
    marginBottom: '32px',
  },

  [`@media (min-width: ${styleBreakpoint}px)`]: {
    display: 'table-row',
    padding: '0',
    border: 'none',
  },
};

export const folderDropTargetRowStyles: CSSObject = {
  position: 'relative',

  '& > td': {
    backgroundColor: 'var(--accent-color-fade-8)',
  },

  '&::after': {
    position: 'absolute',
    zIndex: 1,
    top: '4px',
    right: '8px',
    bottom: '4px',
    left: '8px',
    border: '2px dashed var(--accent-color)',
    borderRadius: '8px',
    content: '""',
    pointerEvents: 'none',
  },
};

export const folderDropOverlayStyles: CSSObject = {
  position: 'absolute',
  zIndex: 2,
  top: '50%',
  left: '50%',
  display: 'flex',
  width: '204px',
  minHeight: '136px',
  padding: '16px',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  borderRadius: '24px',
  backgroundColor: 'var(--accent-color-50)',
  color: 'var(--main-color)',
  pointerEvents: 'none',
  textAlign: 'center',
  transform: 'translate(-50%, -50%)',

  'body.theme-dark &': {
    backgroundColor: 'var(--accent-color-800)',
  },
};

export const folderDropOverlayTitleStyles: CSSObject = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '20px',
};

export const folderDropOverlayDescriptionStyles: CSSObject = {
  margin: 0,
  fontSize: '12px',
  fontWeight: 400,
  lineHeight: '16px',
};

export const folderDropOverlayFolderNameStyles: CSSObject = {
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'normal',
};
