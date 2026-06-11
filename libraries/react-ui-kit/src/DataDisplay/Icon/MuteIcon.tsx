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

export const MuteIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M3.3 14.5A8 8 0 0 0 14 13.4L12.5 12a6 6 0 0 1-7.4 1.2l-1.8 1.3zm8.7-6a4 4 0 0 1-5 3.4l5-3.4zM12 4a4 4 0 0 0-4-4 4 4 0 0 0-4 4v4c0 .5 0 1 .2 1.4L1 11.7l-.8.5 1 1.8.9-.6 13-9 .8-.5L14.8 2l-.9.6L12 4z" />
  </SVGIcon>
);
