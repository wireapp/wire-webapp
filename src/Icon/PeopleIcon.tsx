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

import {SVGIcon, SVGIconProps} from './SVGIcon';

export const PeopleIcon = ({...props}: SVGIconProps) => (
  <SVGIcon realWidth={14} realHeight={16} {...props}>
    <path d="M10.6 10h.4a3 3 0 0 1 3 3v1.27a14.93 14.93 0 0 1-14 0V13a3 3 0 0 1 3-3h.4a6.97 6.97 0 0 0 7.2 0zM7 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
  </SVGIcon>
);
