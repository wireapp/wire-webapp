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

export const ServicesIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={32} realHeight={32} {...props}>
    <path d="M10.5 12A6.5 6.5 0 0 0 4 18.5V24a1 1 0 0 0 1 1h22a1 1 0 0 0 1-1v-5.5a6.5 6.5 0 0 0-6.5-6.5h-11zm-7.12-1.22L.24 4.95a2 2 0 1 1 3.52-1.9L6.8 8.68C7.94 8.24 9.19 8 10.5 8h11C27.3 8 32 12.7 32 18.5V24a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5v-5.5c0-3.05 1.3-5.8 3.38-7.72zM11 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0m7 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0m5 2a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm5.26-9.55a2 2 0 0 1-3.52-1.9l3.5-6.5a2 2 0 0 1 3.52 1.9l-3.5 6.5z" />
  </SVGIcon>
);
