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

export const PlaneIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={12} realHeight={12} {...props}>
    <path d="M0 10.7c0 1 .8 1.6 1.8 1L11.3 7c1-.6 1-1.4 0-2L1.8.3C.8-.3 0 .3 0 1.3V6h9L0 7.5v3.2z" />
  </SVGIcon>
);
