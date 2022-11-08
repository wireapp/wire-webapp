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

import {ArrowProps, rotation} from './ArrowIcon';
import {SVGIcon} from './SVGIcon';

export const ChevronIcon = ({direction = 'right', ...props}: ArrowProps) => (
  <SVGIcon realWidth={5} realHeight={8} {...props}>
    <path transform={`rotate(${rotation[direction]} 3 4)`} d="M0 .92L.94 0 5 4 .94 8 0 7.08 3.13 4z" />
  </SVGIcon>
);
