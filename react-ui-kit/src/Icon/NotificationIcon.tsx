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

export const NotificationIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M7 0C5 0 3.3 1.4 3 3.2c0 0-.5 3-1 4.3L.8 10.2C.4 11.2 1 12 2 12h10c1.1 0 1.6-.8 1.2-1.8L12 7.5c-.4-1.2-1-4.3-1-4.3A4 4 0 0 0 7 0zm2 14a2 2 0 1 1-4 0h4z" />
  </SVGIcon>
);
