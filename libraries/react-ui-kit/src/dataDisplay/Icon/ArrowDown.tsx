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

import {SVGIcon, SVGIconProps} from './SVGIcon';

export const ArrowDown = ({...props}: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M7.99963 12.5711L15.6565 4.91421L14.2423 3.5L7.99963 9.74264L1.75699 3.5L0.342773 4.91421L7.99963 12.5711Z" />
  </SVGIcon>
);
