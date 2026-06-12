/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

export const EnterIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={24} realHeight={18} {...props}>
    <path d="M11.643 7l-1.5 1.4 2.786 2.6H2v2h10.929l-2.786 2.6 1.5 1.4L17 12l-5.357-5zM21.8 19H13v2h8.8c1.21 0 2.2-.9 2.2-2V5c0-1.1-.99-2-2.2-2H13v2h8.8v14z" />
  </SVGIcon>
);
