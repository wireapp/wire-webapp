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

export const HangupIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={20} realHeight={8} {...props}>
    <path d="M.6 2.7C2.2 1.2 6 0 9.7 0c3.8 0 7.6 1.2 9 2.7 1 .9.9 2.9 0 4.6l-.3.3H18A216 216 0 0 0 14 6c-.4-.1-.3-.1-.3-.5V3.4l-1-.2a13 13 0 0 0-6.2 0l-.9.2V6l-.4.2a155.4 155.4 0 0 0-3.8 1.5c-.4.1-.4.1-.6-.3-1-1.7-1-3.7-.2-4.6z" />
  </SVGIcon>
);
