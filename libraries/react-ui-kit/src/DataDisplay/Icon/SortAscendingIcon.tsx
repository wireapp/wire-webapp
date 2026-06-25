/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

export const SortAscendingIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={14} realHeight={14} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.125 11.375H0V9.84375H6.125V11.375ZM4.375 7.875H0V6.34375H4.375V7.875ZM2.625 4.375H0.694336L0 4.37109V2.84766L0.694336 2.84375H2.625V4.375Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13.5889 5.22363L12.6611 6.15137L11.1562 4.64648V12.25H9.84375V4.64648L8.33887 6.15137L7.41113 5.22363L10.5 2.13477L13.5889 5.22363Z"
    />
  </SVGIcon>
);
