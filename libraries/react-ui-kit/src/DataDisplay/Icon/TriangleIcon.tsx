/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {Rotation} from './ArrowIcon';
import {SVGIcon, SVGIconProps} from './SVGIcon';

export interface Props extends SVGIconProps {
  direction?: keyof Rotation;
}

const rotation: Rotation = {
  down: 0,
  left: 90,
  up: 180,
  right: 270,
};

export const TriangleIcon = ({direction = 'down', ...props}: Props) => (
  <SVGIcon realWidth={8} realHeight={8} {...props}>
    <path transform={`rotate(${rotation[direction]} 4 4)`} fillRule="evenodd" d="M0 2h8L4 7" />
  </SVGIcon>
);
