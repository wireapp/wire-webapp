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

export const CallIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M12.7 16c1.3 0 2.7-1.5 3.2-3.4.1-.4.2-.4-.2-.6a218.3 218.3 0 0 1-4.3-1.7l-.1.1-1 1-.6.5-.7-.4A12.9 12.9 0 0 1 4.5 7l-.4-.7.6-.6.9-1c.2-.2.2-.2 0-.6A109.3 109.3 0 0 0 3.8 0h-.3C1.4.7 0 2 0 3.4c0 2 1.8 5.6 4.5 8.2C7 14.2 10.6 16 12.7 16z" />
  </SVGIcon>
);
