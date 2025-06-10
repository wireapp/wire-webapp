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

import {Rotation} from './ArrowIcon';
import {SVGIcon, SVGIconProps} from './SVGIcon';

export interface DropdownFilledIconProps extends SVGIconProps {
  direction?: keyof Rotation;
}

const rotation: Rotation = {
  down: 0,
  left: 90,
  up: 180,
  right: 270,
};

export const DropdownFilledIcon = ({direction = 'down', ...props}: DropdownFilledIconProps) => (
  <SVGIcon realWidth={10} realHeight={5} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      transform={`rotate(${rotation[direction]} 5 2.5)`}
      d="M0.853553 0.853553C0.53857 0.53857 0.761654 0 1.20711 0H8.79289C9.23835 0 9.46143 0.538571 9.14645 0.853553L5.35355 4.64645C5.15829 4.84171 4.84171 4.84171 4.64645 4.64645L0.853553 0.853553Z"
    />
  </SVGIcon>
);
