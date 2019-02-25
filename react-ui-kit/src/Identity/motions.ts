/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {keyframes} from '@emotion/core';

// https://motion.wire.com/_guidelines_/rules.html

/**
 * Duration exception - When a motion longer than 0.7 seconds is needed use a multiplier of 700.
 */
export const DURATION = {
  DEFAULT: 550,
  EXTRA_LONG: 2400,
  PROACTIVE_FAST: 150,
  PROACTIVE_SLOW: 350,
  SYSTEM: 700,
};

/**
 * The rule of thumb is using Quart Out when animating only the object's opacity,
 * otherwise use Expo Out ease.
 */
export const EASE = {
  EXPONENTIAL: 'cubic-bezier(0.19, 1, 0.22, 1)',
  QUART: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
};

export const ANIMATION = {
  bottomUpMovement: keyframes`
    0% {
      transform: translateY(100%);
    }
    100% {
      transform: translateY(0);
    }
  `,
  fadeIn: keyframes`
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  `,
  rotate: keyframes`
    0% {
      transform: rotate(0);
    }
    100% {
      transform: rotate(360deg);
    }
  `,
  topDownMovement: keyframes`
    0% {
      transform: translateY(-100%);
    }
    100% {
      transform: translateY(0);
    }
  `,
  topDownMovementLight: keyframes`
    0% {
      transform: translateY(-20%);
    }
    100% {
      transform: translateY(0);
    }
  `,
};

export const defaultTransition = 'all 0.24s';
