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

export const SearchIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      d="M6.987 0a6.99 6.99 0 016.987 6.993c0 1.571-.517 3.02-1.39 4.188L16 14.587 14.588 16l-3.416-3.406a6.952 6.952 0 01-4.185 1.392A6.99 6.99 0 010 6.993 6.99 6.99 0 016.987 0zM12 7A5 5 0 112 7a5 5 0 0110 0z"
    />
  </SVGIcon>
);
