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
  marginLeft: 15,
  color: 'var(--text-input-placeholder)',
  fontSize: 11,
  fontWeight: 500,
  paddingTop: 2,
  backgroundColor: 'var(--app-bg)',
  padding: 5,
  position: 'absolute',
  bottom: 56,
  borderTopLeftRadius: 4,
  borderTopRightRadius: 4,
};

export const indicatorAnimationWrapperStyles: CSSObject = {
  width: 38,
  height: 16,
  marginLeft: 2,
  position: 'relative',
  bottom: 3,
};

const animationStyles: CSSObject = {
  animationFillMode: 'forwards',
  animationDirection: 'normal',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
  animationDuration: '1.4s',
};

const dotStyles: CSSObject = {
  ...animationStyles,
  position: 'absolute',
  width: 2,
  height: 2,
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
  '9%': {transform: 'translateX(2px) rotate(-5deg)'},
  '34%': {transform: 'translateX(5px) rotate(5deg)'},
  '59%': {transform: 'translateX(7px) rotate(-5deg)'},
  '84%': {transform: 'translateX(12px) rotate(5deg)'},
  '100%': {transform: 'translateX(12px) rotate(5deg)'},
});

const dot1KeyFrames = keyframes({
  '0%': {opacity: 0},
  '4%': {opacity: 0},
  '84%': {opacity: 1},
  '100%': {opacity: 1},
});

const dot2KeyFrames = keyframes({
  '0%': {opacity: 0},
  '29%': {opacity: 0},
  '84%': {opacity: 1},
  '100%': {opacity: 1},
});

const dot3KeyFrames = keyframes({
  '0%': {opacity: 0},
  '54%': {opacity: 0},
  '84%': {opacity: 1},
  '100%': {opacity: 1},
});

export const editIconStyles = css`
  animation: ${editIconKeyFrams};
  bottom: 0;
  fill: var(--text-input-placeholder);
  ${animationStyles}
  position: absolute;
`;

export const dotOneStyles = css`
  animation: ${dot1KeyFrames};
  left: 0;
  ${dotStyles};
`;

export const dotTwoStyles = css`
  animation: ${dot2KeyFrames};
  left: 4px;
  ${dotStyles};
`;

export const dotThreeStyles = css`
  animation: ${dot3KeyFrames};
  left: 8px;
  ${dotStyles};
`;

export const indicatorTitleStyles = css`
  height: 16px;
  position: relative;
  top: 1px;
`;
