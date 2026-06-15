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

import {Theme} from '../../Identity/Theme';
import {overlayPortalZIndex} from '../../utils/overlayPortal';

/** Must exceed react-aria's inline overlay z-index (100000). Applied via `style` on Popover. */
export const calendarPopoverZIndex = overlayPortalZIndex;

/** Minimum width for a 7-column calendar grid (7 × 36px cells + 24px popover padding). */
export const calendarPopoverMinWidth = 276;

export const datePickerWrapperStyles: CSSObject = {
  width: '100%',
  minWidth: 0,
  '.react-aria-DatePicker': {
    width: '100%',
    minWidth: 0,
  },
  '.react-aria-Group': {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
};

export const datePickerGroupStyles = (theme: Theme): CSSObject => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  alignSelf: 'stretch',
  boxSizing: 'border-box',
  minHeight: '48px',
  padding: '10px 14px',
  borderRadius: '14px',
  border: `1px solid ${theme.Select.borderColor}`,
  backgroundColor: theme.Input.backgroundColor,
});

export const datePickerGroupFocusStyles = (theme: Theme): CSSObject => ({
  '&[data-focus-visible]': {
    borderColor: theme.general.primaryColor,
  },
  '.react-aria-DatePicker[data-open] &': {
    borderColor: theme.general.primaryColor,
  },
});

export const datePickerGroupInvalidStyles = (theme: Theme): CSSObject => ({
  borderColor: theme.general.dangerColor,
  boxShadow: 'none',
  outline: 'none',
});

export const datePickerGroupDisabledStyles: CSSObject = {
  opacity: 0.5,
  cursor: 'not-allowed',
};

export const dateInputStyles = (theme: Theme): CSSObject => ({
  display: 'flex',
  alignItems: 'center',
  gap: 0,
  fontSize: theme.fontSizes.medium,
  color: theme.general.color,
  flex: '1 1 0',
  minWidth: 0,
  width: '100%',
});

export const dateSegmentStyles = (theme: Theme): CSSObject => ({
  padding: '2px 0',
  borderRadius: '6px',
  margin: 0,
  '&[data-type="literal"]': {
    padding: 0,
    margin: 0,
  },
  '&[data-placeholder]': {
    color: theme.Input.placeholderColor,
  },
  '&[data-focused]': {
    backgroundColor: theme.IconButton.hoverPrimaryBgColor,
  },
});

export const calendarButtonStyles = (theme: Theme): CSSObject => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  border: '1px solid transparent',
  background: 'transparent',
  color: theme.general.color,
  cursor: 'pointer',
  flexShrink: 0,
  '&:hover, &[data-focus-visible]': {
    backgroundColor: theme.IconButton.hoverPrimaryBgColor,
  },
});

export const calendarIconStyles: CSSObject = {
  width: '18px',
  height: '18px',
};

export const calendarPopoverStyles = (theme: Theme): CSSObject => ({
  backgroundColor: theme.Input.backgroundColor,
  border: `1px solid ${theme.Select.borderColor}`,
  borderRadius: '16px',
  padding: '12px',
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
  minWidth: `${calendarPopoverMinWidth}px`,
  width: `max(var(--trigger-width), ${calendarPopoverMinWidth}px)`,
  maxWidth: `max(var(--trigger-width), ${calendarPopoverMinWidth}px)`,
  boxSizing: 'border-box',
  color: theme.general.color,
});

export const calendarHeaderStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  marginBottom: '10px',
};

export const calendarHeadingStyles = (theme: Theme): CSSObject => ({
  fontSize: theme.fontSizes.medium,
  fontWeight: 600,
  color: theme.general.color,
});

export const calendarNavButtonStyles = (theme: Theme): CSSObject => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '8px',
  border: `1px solid ${theme.Select.borderColor}`,
  backgroundColor: theme.Input.backgroundColor,
  color: theme.general.color,
  cursor: 'pointer',
  '&:hover, &[data-focus-visible]': {
    backgroundColor: theme.IconButton.hoverPrimaryBgColor,
  },
});

export const calendarGridStyles = (theme: Theme): CSSObject => ({
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: theme.fontSizes.small,
  color: theme.general.color,
});

export const calendarGridHeaderStyles = (theme: Theme): CSSObject => ({
  textTransform: 'uppercase',
  fontSize: theme.fontSizes.small,
  color: theme.Input.placeholderColor,
});

export const calendarHeaderCellStyles: CSSObject = {
  paddingBottom: '6px',
  textAlign: 'center',
  fontWeight: 600,
  verticalAlign: 'middle',
  width: '36px',
};

export const calendarCellStyles = (theme: Theme): CSSObject => ({
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
  backgroundColor: 'transparent',
  color: theme.general.color,
  '&[data-outside-month]': {
    color: theme.Input.placeholderColor,
  },
  '&[data-hovered]': {
    backgroundColor: theme.Select.optionHoverBg,
    color: theme.general.color,
  },
  '&[data-outside-month][data-hovered]': {
    color: theme.Input.placeholderColor,
  },
  '&[data-selected]': {
    backgroundColor: theme.general.primaryColor,
    color: theme.Select.contrastTextColor,
  },
  '&[data-selected][data-hovered]': {
    backgroundColor: theme.general.primaryColor,
    color: theme.Select.contrastTextColor,
  },
  '&[data-focus-visible]:not([data-selected])': {
    backgroundColor: theme.Select.optionHoverBg,
    outline: `2px solid ${theme.general.primaryColor}`,
    outlineOffset: '0',
  },
  '&[data-focus-visible][data-selected]': {
    outline: `2px solid ${theme.Select.contrastTextColor}`,
    outlineOffset: '0',
  },
  '&[data-disabled]': {
    backgroundColor: 'transparent',
    color: theme.Select.disabledColor,
    cursor: 'not-allowed',
  },
});
