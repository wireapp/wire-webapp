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

import {isNan} from '@sindresorhus/is';

export const calculateChildWindowPosition = (childHeight: number, childWidth: number) => {
  const screenLeft = window.screenLeft !== 0 && !isNan(window.screenLeft) ? window.screenLeft : window.screenX;
  const screenTop = window.screenTop !== 0 && !isNan(window.screenTop) ? window.screenTop : window.screenY;

  const hasInnerMeasurements =
    window.innerHeight !== 0 && !isNan(window.innerHeight) && window.innerWidth !== 0 && !isNan(window.innerWidth);

  let parentHeight = hasInnerMeasurements ? window.innerHeight : window.screen.height;
  let parentWidth = hasInnerMeasurements ? window.innerWidth : window.screen.width;

  if (!hasInnerMeasurements) {
    if (document.documentElement.clientHeight !== 0 && !isNan(document.documentElement.clientHeight)) {
      parentHeight = document.documentElement.clientHeight;
    }
    if (document.documentElement.clientWidth !== 0 && !isNan(document.documentElement.clientWidth)) {
      parentWidth = document.documentElement.clientWidth;
    }
  }

  const left = parentWidth / 2 - childWidth / 2 + screenLeft;
  const top = parentHeight / 2 - childHeight / 2 + screenTop;
  return {left, top};
};
