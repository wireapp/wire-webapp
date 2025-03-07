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

import {SVGIcon, SVGIconProps} from './SVGIcon';

export const CollectionIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M2.425 0a.655.655 0 0 0-.656.656v.656h10.5V.656A.655.655 0 0 0 11.612 0H2.425ZM.894 3.281c0-.362.29-.656.658-.656h10.933c.364 0 .659.291.659.656v.656H.894v-.656Zm-.788 2.84a.775.775 0 0 1 .788-.871h12.249c.483 0 .837.387.788.871L13.144 14H.894L.106 6.121Z" />
  </SVGIcon>
);
