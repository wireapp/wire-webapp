/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {isTruthy} from '@sindresorhus/is';

export const calculateChildWindowPosition = (childHeight: number, childWidth: number) => {
  const screenLeft = isTruthy(window.screenLeft) ? window.screenLeft : window.screenX;
  const screenTop = isTruthy(window.screenTop) ? window.screenTop : window.screenY;

  const hasInnerMeasurements = isTruthy(window.innerHeight) && isTruthy(window.innerWidth);

  let parentHeight = hasInnerMeasurements ? window.innerHeight : window.screen.height;
  let parentWidth = hasInnerMeasurements ? window.innerWidth : window.screen.width;

  if (!hasInnerMeasurements) {
    if (isTruthy(document.documentElement.clientHeight)) {
      parentHeight = document.documentElement.clientHeight;
    }
    if (isTruthy(document.documentElement.clientWidth)) {
      parentWidth = document.documentElement.clientWidth;
    }
  }

  const left = parentWidth / 2 - childWidth / 2 + screenLeft;
  const top = parentHeight / 2 - childHeight / 2 + screenTop;
  return {left, top};
};
