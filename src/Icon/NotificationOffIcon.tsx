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

export const NotificationOffIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M12 3.2l2-1.4a1 1 0 0 1 1.2 1.6L1.6 13a1 1 0 0 1-1.1-1.6l1.3-.9v-.2S2.7 8.5 3 7.5c.4-1.2 1-4.3 1-4.3C4.3 1.4 6 0 8 0a4 4 0 0 1 4 3.2zm1 4.2v.1l1.2 2.7c.4 1-.1 1.8-1.2 1.8H6.4L13 7.4zM10 14a2 2 0 1 1-4 0h4z" />
  </SVGIcon>
);
