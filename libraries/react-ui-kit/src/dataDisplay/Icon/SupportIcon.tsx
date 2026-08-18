/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

export const SupportIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={13} {...props}>
    <path d="M11.33 14.159a7.032 7.032 0 0 0 2.829-2.829l-2.294-2.294a4.005 4.005 0 0 0 0-2.072l2.294-2.294a7.032 7.032 0 0 0-2.829-2.83L9.036 4.135a4.005 4.005 0 0 0-2.072 0L4.67 1.841A7.032 7.032 0 0 0 1.84 4.67l2.294 2.294a4.005 4.005 0 0 0 0 2.072L1.841 11.33a7.032 7.032 0 0 0 2.829 2.83l2.294-2.294a4.005 4.005 0 0 0 2.072 0l2.294 2.294zM8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm0-4a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 1A5 5 0 1 1 8 3a5 5 0 0 1 0 10z" />
  </SVGIcon>
);
