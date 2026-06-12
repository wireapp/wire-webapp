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

import {SVGIcon, SVGIconProps} from './SVGIcon';

export interface Rotation {
  down: number;
  left: number;
  right: number;
  up: number;
}

export interface ArrowProps extends SVGIconProps {
  direction?: keyof Rotation;
}

export const rotation: Rotation = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};

export const ArrowIcon = ({direction = 'right', ...props}: ArrowProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path transform={`rotate(${rotation[direction]} 8 8)`} d="M5.8 1.5L7.3 0l8 8-8 8-1.5-1.5L11.3 9H.7V7h10.6" />
  </SVGIcon>
);
