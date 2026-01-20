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

import {BASE_DARK_COLOR, BASE_LIGHT_COLOR, COLOR} from '@wireapp/react-ui-kit';

export const expirationContentStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  width: '100%',
};

export const expirationLabelStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-regular)',
  color: 'var(--main-color)',
};

export const expirationFieldsRowStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 160px)',
  gap: '12px',
  width: '100%',
  '@media (max-width: 520px)': {
    gridTemplateColumns: 'minmax(0, 1fr)',
  },
};

export const datePickerGroupStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  width: '100%',
  minHeight: '48px',
  padding: '10px 14px',
  borderRadius: '14px',
  border: '1px solid var(--text-input-border)',
  backgroundColor: 'var(--text-input-background)',
  'body.theme-dark &': {
    backgroundColor: COLOR.BLACK_LIGHTEN_24,
    borderColor: 'var(--text-input-border)',
  },
};

export const datePickerGroupFocusStyles: CSSObject = {
  '&[data-focus-visible]': {
    borderColor: 'var(--accent-color)',
  },
  '.react-aria-DatePicker[data-open] &': {
    borderColor: 'var(--accent-color)',
  },
  'body.theme-dark &': {
    '&&[data-focus-visible]': {
      borderColor: 'var(--accent-color)',
    },
    '.react-aria-DatePicker[data-open] &': {
      borderColor: 'var(--accent-color)',
    },
  },
};

export const dateInputStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: 0,
  fontSize: 'var(--font-size-medium)',
  color: 'var(--main-color)',
};

export const dateSegmentStyles: CSSObject = {
  padding: '2px 0',
  borderRadius: '6px',
  margin: 0,
  '&[data-type="literal"]': {
    padding: 0,
    margin: 0,
  },
  '&[data-placeholder]': {
    color: 'var(--gray-60)',
  },
  '&[data-focused]': {
    backgroundColor: 'var(--gray-20)',
  },
  'body.theme-dark &[data-focused]': {
    backgroundColor: 'var(--gray-80)',
  },
};

export const calendarButtonStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  border: '1px solid transparent',
  background: 'transparent',
  color: 'var(--main-color)',
  cursor: 'pointer',
  '&:hover, &[data-focus-visible]': {
    backgroundColor: 'var(--gray-20)',
  },
  'body.theme-dark &': {
    color: 'var(--white)',
    '&:hover, &[data-focus-visible]': {
      backgroundColor: 'var(--gray-80)',
    },
  },
};

export const calendarIconStyles: CSSObject = {
  width: '18px',
  height: '18px',
};

export const calendarPopoverStyles: CSSObject = {
  backgroundColor: 'var(--white)',
  border: '1px solid var(--gray-40)',
  borderRadius: '16px',
  padding: '12px',
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
  width: 'var(--trigger-width)',
  maxWidth: 'var(--trigger-width)',
  boxSizing: 'border-box',
  zIndex: 10000020,
  'body.theme-dark &': {
    backgroundColor: 'var(--gray-90)',
    borderColor: 'var(--gray-100)',
  },
};

export const calendarHeaderStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  marginBottom: '10px',
};

export const calendarHeadingStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--main-color)',
};

export const calendarNavButtonStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '8px',
  border: '1px solid var(--gray-30)',
  backgroundColor: 'var(--white)',
  cursor: 'pointer',
  '&:hover, &[data-focus-visible]': {
    backgroundColor: 'var(--gray-20)',
  },
  'body.theme-dark &': {
    backgroundColor: 'var(--gray-90)',
    borderColor: 'var(--gray-100)',
    '&:hover, &[data-focus-visible]': {
      backgroundColor: 'var(--gray-80)',
    },
  },
};

export const calendarGridStyles: CSSObject = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: 'var(--font-size-small)',
  color: 'var(--main-color)',
};

export const calendarGridHeaderStyles: CSSObject = {
  textTransform: 'uppercase',
  fontSize: 'var(--font-size-small)',
  color: 'var(--gray-70)',
};

export const calendarHeaderCellStyles: CSSObject = {
  paddingBottom: '6px',
  textAlign: 'center',
  fontWeight: 'var(--font-weight-semibold)',
  verticalAlign: 'middle',
  width: '36px',
};

export const calendarCellStyles: CSSObject = {
  width: '36px',
  height: '36px',
  textAlign: 'center',
  borderRadius: '10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
  lineHeight: 1,
  '&[data-outside-month]': {
    color: 'var(--gray-60)',
  },
  '&[data-selected]': {
    backgroundColor: 'var(--accent-color) !important',
    color: 'var(--white) !important',
  },
  '&[data-focus-visible]': {
    outline: '2px solid var(--accent-color)',
    outlineOffset: '2px',
  },
  '&[data-disabled]': {
    color: 'var(--gray-50)',
    cursor: 'not-allowed',
  },
};

export const timeSelectWrapperStyles: CSSObject = {
  width: '100%',
};

export const timeSelectStyles: CSSObject = {
  height: '48px',
  minHeight: '48px',
  borderRadius: '14px',
  '& .css-1dimb5e-singleValue': {
    color: 'var(--main-color)',
  },
  '& [class*="singleValue"]': {
    color: 'var(--main-color)',
  },
};

export const timeSelectMenuStyles: CSSObject = {
  '& [role="option"]': {
    color: 'var(--main-color)',
  },
};

export const timeSelectMenuPortalStyles: CSSObject = {
  zIndex: 10000010,
};

export const expirationErrorBorderStyles: CSSObject = {
  borderColor: BASE_LIGHT_COLOR.RED,
  boxShadow: 'none',
  outline: 'none',
  'body.theme-dark &': {
    borderColor: BASE_DARK_COLOR.RED,
  },
};

export const expirationErrorLabelStyles: CSSObject = {
  color: BASE_LIGHT_COLOR.RED,
  'body.theme-dark &': {
    color: BASE_DARK_COLOR.RED,
  },
};

export const expirationErrorTextStyles: CSSObject = {
  fontSize: 'var(--font-size-small)',
  color: BASE_LIGHT_COLOR.RED,
  'body.theme-dark &': {
    color: BASE_DARK_COLOR.RED,
  },
};

export const expirationErrorShadowStyles: CSSObject = {
  borderColor: BASE_LIGHT_COLOR.RED,
  boxShadow: `0 0 0 1px ${BASE_LIGHT_COLOR.RED}`,
  outline: 'none',
  'body.theme-dark &': {
    borderColor: BASE_DARK_COLOR.RED,
    boxShadow: `0 0 0 1px ${BASE_DARK_COLOR.RED}`,
  },
};

export const timeSelectLabelVisuallyHiddenStyles: CSSObject = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px',
};
