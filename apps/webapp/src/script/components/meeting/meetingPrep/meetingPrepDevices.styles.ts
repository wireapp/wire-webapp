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

import {videoOptionsMenuStyles} from '../../calling/VideoControls/VideoControls.styles';

export const meetingPrepDeviceRowsStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

// One format for every state; the tone sets the colour.
export const meetingPrepCalloutStyles: CSSObject = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  marginBottom: 12,
  padding: '8px 10px',
  borderRadius: 8,
  fontSize: 14,
  lineHeight: '20px',
  color: 'var(--tone)',
  backgroundColor: 'color-mix(in srgb, var(--tone) 10%, transparent)',

  svg: {
    flexShrink: 0,
    marginTop: 2,
  },
};

export const meetingPrepCalloutSuccessStyles: CSSObject = {
  ...meetingPrepCalloutStyles,
  '--tone': 'var(--success-color)',
};

export const meetingPrepCalloutWarningStyles: CSSObject = {
  ...meetingPrepCalloutStyles,
  '--tone': 'var(--amber-500)',
};

export const meetingPrepCalloutStatusStyles: CSSObject = {
  fontWeight: 600,
};

export const meetingPrepRowStyles: CSSObject = {
  position: 'relative',
  outline: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  minHeight: 48,
  padding: '0 8px 0 0',
  border: '1px solid var(--border-color)',
  borderRadius: 8,
  backgroundColor: 'var(--app-bg-secondary)',

  '&:hover': {
    borderColor: 'var(--foreground-fade-24)',
  },
};

export const meetingPrepRowTriggerStyles: CSSObject = {
  display: 'flex',
  flex: 1,
  minWidth: 0,
  alignItems: 'center',
  gap: 12,
  alignSelf: 'stretch',
  padding: '0 4px 0 13px',
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--main-color)',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left',

  '&:focus-visible': {
    outline: '2px solid var(--accent-color)',
    outlineOffset: -2,
  },
};

// A row the browser cannot switch: same layout, nothing to click.
export const meetingPrepRowStaticStyles: CSSObject = {
  ...meetingPrepRowTriggerStyles,
  cursor: 'default',
};

export const meetingPrepRowTextStyles: CSSObject = {
  display: 'flex',
  flex: 1,
  minWidth: 0,
  flexDirection: 'column',
};

export const meetingPrepRowLabelStyles: CSSObject = {
  color: 'var(--text-input-placeholder)',
  fontSize: 11,
  lineHeight: '14px',
};

export const meetingPrepRowValueStyles: CSSObject = {
  overflow: 'hidden',
  fontSize: 14,
  fontWeight: 500,
  lineHeight: '18px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// The existing input level, drawn as thin bars to fit in a row.
export const meetingPrepRowMeterStyles: CSSObject = {
  width: 'auto',

  '.input-level': {
    gap: 2,
  },

  '.input-level__bullet, .input-level__bullet--disabled': {
    width: 3,
    minWidth: 3,
    height: 12,
    flex: '0 0 3px',
    borderRadius: 2,
    backgroundColor: 'var(--foreground-fade-16)',
    borderColor: 'transparent',
  },

  '.input-level__bullet--active': {
    backgroundColor: 'var(--success-color)',
  },
};

export const meetingPrepRowActionStyles: CSSObject = {
  padding: '4px 6px',
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--accent-color)',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 14,
  fontWeight: 600,

  '&:hover:not([aria-disabled="true"])': {
    backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)',
  },

  '&[aria-disabled="true"]': {
    cursor: 'progress',
    color: 'var(--text-input-placeholder)',
  },

  '&:focus-visible': {
    outline: '2px solid var(--accent-color)',
  },
};

// The call device menu, opened under its row.
export const meetingPrepRowMenuStyles: CSSObject = {
  ...videoOptionsMenuStyles,
  top: 'calc(100% + 4px)',
  bottom: 'auto',
  left: 0,
  right: 0,
  transform: 'none',
  width: 'auto',
  maxWidth: 'calc(100vw - 32px)',
  zIndex: 30,
  '@media (max-height: 500px)': {
    '& [role="listbox"]': {
      maxHeight: 170,
      overflowY: 'auto',
    },
  },
};
