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

import {CSSObject, keyframes} from '@emotion/react';

import {chipSizeStyles} from '../../calling/encryptedBadge/encryptedBadge.styles';

const pulse = keyframes({
  '50%': {opacity: 0.35},
});

export const meetingPrepPanelStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  minWidth: 0,
};

export const meetingPrepChipsStyles: CSSObject = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
};

export const meetingPrepStatusStyles: CSSObject = {
  ...chipSizeStyles,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 7px',
  borderRadius: 4,
  backgroundColor: 'color-mix(in srgb, var(--main-color) 7%, transparent)',
  color: 'var(--main-color)',
  fontWeight: 500,
  fontVariantNumeric: 'tabular-nums',
};

export const meetingPrepLiveDotStyles: CSSObject = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: 'var(--success-color)',

  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${pulse} 1.6s ease-in-out infinite`,
  },
};

export const meetingPrepPanelTitleStyles: CSSObject = {
  margin: 0,
  fontSize: 24,
  fontWeight: 600,
  lineHeight: '30px',
  overflowWrap: 'anywhere',
  textWrap: 'balance',
};

export const meetingPrepPanelTimeStyles: CSSObject = {
  margin: '4px 0 0',
  color: 'var(--text-input-placeholder)',
  fontSize: 14,
  fontVariantNumeric: 'tabular-nums',
};

// A link with an icon: easy to spot, but with no fill or border it reads as an option, not as a
// step everyone must take before Join.
export const meetingPrepLinkButtonStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: 8,
  margin: '0 0 0 -6px',
  padding: '4px 6px',
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--accent-color)',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 14,
  fontWeight: 600,

  '&:hover:not(:disabled)': {
    backgroundColor: 'var(--foreground-fade-8)',
  },

  '&:disabled': {
    cursor: 'default',
    opacity: 0.5,
  },

  '&:focus-visible': {
    outline: '2px solid var(--accent-color)',
    outlineOffset: 2,
  },
};

export const meetingPrepLinkIconStyles: CSSObject = {
  width: 16,
  height: 14,
  flexShrink: 0,

  // The icon ships with a black fill; it takes the link colour in both themes.
  path: {
    fill: 'currentColor',
  },
};

export const meetingPrepJoinStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginTop: 4,

  button: {
    width: '100%',
    margin: 0,
  },
};

export const meetingPrepJoinSentenceStyles: CSSObject = {
  margin: 0,
  color: 'var(--text-input-placeholder)',
  fontSize: 12,
  lineHeight: '16px',
  textAlign: 'center',
  textWrap: 'balance',
};
