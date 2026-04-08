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

import {media} from '@wireapp/react-ui-kit';

export const backgroundSettingsWrapperStyles: CSSObject = {
  borderLeft: '1px solid var(--border-color)',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'var(--app-bg-secondary)',
  overflowY: 'hidden',
  width: 280,
  flexShrink: 0,

  [media.mobile]: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
    border: '2px solid var(--accent-color)',
    borderRadius: 10,
  },
};

export const backgroundSettingsHeaderStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid var(--border-color)',
  flexShrink: 0,

  '& button': {
    minWidth: 'auto',
    minHeight: 'auto',
  },
};

export const backgroundSettingsTitleStyles: CSSObject = {
  fontSize: 14,
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--main-color)',
};

export const backgroundSettingsScrollableContentStyles: CSSObject = {
  overflowY: 'auto',
  flex: 1,
  padding: '12px 16px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

export const sectionLabelStyles: CSSObject = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--gray-70)',
  marginBottom: 8,
};

/** 2-column grid for blur and virtual background tiles. */
export const tileGridStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 8,
};

export const tileButtonStyles: CSSObject = {
  background: 'none',
  border: 'none',
  color: 'var(--main-color)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  padding: 0,
  textAlign: 'center',

  '&:focus-visible .bg-tile__preview': {
    outline: '2px solid var(--accent-color-focus)',
    outlineOffset: 2,
  },

  '&[data-selected="true"] .bg-tile__preview': {
    borderColor: 'var(--accent-color)',
    boxShadow: '0 0 0 2px var(--accent-color)',
  },

  '&:hover .bg-tile__preview': {
    transform: 'translateY(-1px)',
  },

  '&:disabled': {
    cursor: 'default',
    opacity: 0.5,
  },
};

export const tilePreviewStyles: CSSObject = {
  position: 'relative',
  width: '100%',
  height: 70,
  borderRadius: 8,
  border: '1px solid var(--inactive-call-button-border)',
  backgroundColor: 'var(--gray-20)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  overflow: 'hidden',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const tilePreviewContentStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  fontSize: 10,
  color: 'black', // no design for dark mode, so keeping it black.
};
