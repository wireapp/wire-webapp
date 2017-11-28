/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import IconBase from './IconBase';
import React from 'react';

class CheckIcon extends IconBase {
  /* eslint-disable no-magic-numbers */
  width = 16;
  height = 12;
  renderSVG(width, height, color) {
    return (
      <svg width={width} height={height} viewBox="0 0 16 12">
        <path fill={color} d="M5.66 11.86L15.98 1.4 14.58 0 5.65 9.03 1.4 4.8 0 6.2" />
      </svg>
    );
  }
}

export {CheckIcon};
