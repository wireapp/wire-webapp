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

export const HamburgerIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={12} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M0 2V0H16V2H0ZM0 7H16V5H0V7ZM0 12H16V10H0V12Z" />
  </SVGIcon>
);
