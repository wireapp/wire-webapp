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

const easeOutQuint = 'cubic-bezier(0.22, 1, 0.36, 1)';

const fadeIn = keyframes({
  from: {opacity: 0},
  to: {opacity: 1},
});

const halfTurn = keyframes({
  from: {transform: 'rotate(0deg)'},
  to: {transform: 'rotate(-180deg)'},
});

export const callSecurityLineStyles: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 6px',
  borderRadius: 4,
};

export const callSecurityLineTintedStyles: CSSObject = {
  backgroundColor: 'color-mix(in srgb, var(--success-color) 12%, transparent)',
};

export const callSecurityLabelStyles: CSSObject = {
  color: 'var(--success-color)',
  fontWeight: 500,
};

export const callSecurityMutedLabelStyles: CSSObject = {
  color: 'var(--foreground-fade-56)',
};

export const callSecurityIconStyles: CSSObject = {
  width: 11,
  height: 11,
  flexShrink: 0,
};

export const callSecuritySeparatorStyles: CSSObject = {
  color: 'var(--foreground-fade-56)',
};

export const callSecurityRootStyles: CSSObject = {
  position: 'relative',
  display: 'inline-flex',
};

export const callSecurityButtonStyles: CSSObject = {
  ...callSecurityLineTintedStyles,
  border: 'none',
  margin: 0,
  color: 'inherit',
  cursor: 'pointer',
  font: 'inherit',

  '&:hover, &[aria-expanded="true"]': {
    backgroundColor: 'color-mix(in srgb, var(--success-color) 20%, transparent)',
  },

  '&:focus-visible': {
    outline: '2px solid var(--accent-color)',
    outlineOffset: 2,
  },
};

// Each state change fades its content in. With reduced motion on, the text simply changes.
export const callSecurityFadeInStyles: CSSObject = {
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${fadeIn} 200ms ${easeOutQuint}`,
  },
};

export const callSecurityContentStyles: CSSObject = {
  ...callSecurityFadeInStyles,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

// The update icon turns half a revolution when the key update appears.
export const callSecurityUpdateIconStyles: CSSObject = {
  ...callSecurityIconStyles,
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${halfTurn} 340ms ${easeOutQuint}`,
  },
};
