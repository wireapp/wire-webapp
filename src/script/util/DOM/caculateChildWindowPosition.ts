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

export const calculateChildWindowPosition = (childHeight: number, childWidth: number) => {
  const screenLeft = window.screenLeft || window.screenX;
  const screenTop = window.screenTop || window.screenY;

  const hasInnerMeasurements = window.innerHeight && window.innerWidth;

  const parentHeight = hasInnerMeasurements
    ? window.innerHeight
    : document.documentElement.clientHeight || window.screen.height;
  const parentWidth = hasInnerMeasurements
    ? window.innerWidth
    : document.documentElement.clientWidth || window.screen.width;

  const left = parentWidth / 2 - childWidth / 2 + screenLeft;
  const top = parentHeight / 2 - childHeight / 2 + screenTop;
  return {left, top};
};
