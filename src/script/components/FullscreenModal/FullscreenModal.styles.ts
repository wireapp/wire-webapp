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

const ANIMATION_DURATION = {
  OPEN: '0.75s',
  CLOSE: '0.15s',
  DELAY: '0.15s',
};

export const modalStyles = (isAnimating: boolean): CSSObject => ({
  position: 'fixed',
  zIndex: 10000000,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflowX: 'hidden',
  overflowY: 'auto',
  animationDelay: ANIMATION_DURATION.DELAY,
  animation: `modalFadeIn ${ANIMATION_DURATION.OPEN} var(--ease-out-expo)`,

  '&::before': {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'var(--app-bg)',
    content: '" "',
    opacity: isAnimating ? 1 : 0,
    transition: `opacity ${ANIMATION_DURATION.OPEN} var(--ease-out-quart)`,
  },

  '@keyframes modalFadeIn': {
    from: {
      opacity: 0,
    },
    to: {
      opacity: 1,
    },
  },
});

export const modalFadeinStyles: CSSObject = {
  '&::before': {
    opacity: 1,
  },
};

export const contentStyles = (isAnimating: boolean): CSSObject => ({
  position: 'relative',
  display: 'flex',
  width: '100%',
  height: '100%',
  flexDirection: 'column',
  alignItems: 'center',
  opacity: isAnimating ? 1 : 0,
  transform: isAnimating ? 'scale(1)' : 'scale(0.9)',
  transitionDelay: isAnimating ? `${ANIMATION_DURATION.DELAY}, ${ANIMATION_DURATION.DELAY}` : '0s, 0s',
  transitionDuration: isAnimating
    ? `${ANIMATION_DURATION.OPEN}, ${ANIMATION_DURATION.OPEN}`
    : `${ANIMATION_DURATION.CLOSE}, ${ANIMATION_DURATION.CLOSE}`,
  transitionProperty: 'transform, opacity',
  transitionTimingFunction: isAnimating
    ? 'var(--ease-out-expo), var(--ease-out-expo)'
    : 'var(--ease-in-expo), var(--ease-in-expo)',
});
