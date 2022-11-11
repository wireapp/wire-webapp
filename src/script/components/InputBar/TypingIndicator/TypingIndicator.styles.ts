/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {css, CSSObject, keyframes} from '@emotion/react';

export const wrapperStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '12px',
  marginLeft: '18px',
  color: 'var(--text-input-placeholder)',
  fontSize: '14px',
  fontWeight: 500,
};

export const indicatorAnimationWrapperStyles: CSSObject = {
  width: 38,
  height: 16,
  marginLeft: 4,
  position: 'relative',
};

const animationStyles: CSSObject = {
  animationFillMode: 'forwards',
  animationDirection: 'normal',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
  animationDuration: '1.2s',
};

const dotStyles: CSSObject = {
  ...animationStyles,
  position: 'absolute',
  width: 4,
  height: 4,
  backgroundColor: 'var(--text-input-placeholder)',
  borderRadius: '100%',
  bottom: 0,
  transformBox: 'fill-box',
  transformOrigin: '50% 50%',
};

const editIconKeyFrams = keyframes({
  '0%': {
    transform: 'translateX(0px) rotate(0deg)',
  },
  '25%': {transform: 'translateX(5px) rotate(-5deg)'},
  '50%': {transform: 'translateX(10px) rotate(5deg)'},
  '75%': {transform: 'translateX(15px) rotate(-5deg)'},
  '100%': {transform: 'translateX(25px) rotate(5deg)'},
});

const dot1KeyFrames = keyframes({
  '0%': {opacity: 0},
  '20%': {opacity: 0},
  '100%': {opacity: 1},
});

const dot2KeyFrames = keyframes({
  '0%': {opacity: 0},
  '45%': {opacity: 0},
  '100%': {opacity: 1},
});

const dot3KeyFrames = keyframes({
  '0%': {opacity: 0},
  '70%': {opacity: 0},
  '100%': {opacity: 1},
});

export const editIconStyles = css`
  animation: ${editIconKeyFrams};
  bottom: 0;
  fill: var(--text-input-placeholder);
  position: absolute;
  ${animationStyles}
`;

export const dotOneStyles = css`
  animation: ${dot1KeyFrames};
  left: 0;
  ${dotStyles};
`;

export const dotTwoStyles = css`
  animation: ${dot2KeyFrames};
  left: 8px;
  ${dotStyles};
`;

export const dotThreeStyles = css`
  animation: ${dot3KeyFrames};
  left: 16px;
  ${dotStyles};
`;
