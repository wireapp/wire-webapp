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

export const CloseIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={14} realHeight={14} {...props}>
    <path d="M1.4 13.3l5.25-5.23 5.25 5.24 1.4-1.4-5.23-5.24L13.3 1.4 11.9 0 6.65 5.24 1.4 0 0 1.4l5.24 5.26L0 11.9" />
  </SVGIcon>
);
