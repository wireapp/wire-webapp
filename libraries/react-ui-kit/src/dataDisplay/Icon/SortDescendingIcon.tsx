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

export const SortDescendingIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={14} realHeight={14} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.1562 9.7373L12.6611 8.2334L13.5889 9.16113L10.5 12.25L7.41113 9.16113L8.33887 8.2334L9.84375 9.7373V2.13477H11.1562V9.7373ZM2.625 11.375H0.694336L0 11.3711V9.84766L0.694336 9.84375H2.625V11.375ZM4.375 7.875H0V6.34375H4.375V7.875ZM6.125 4.375H0V2.84375H6.125V4.375Z"
    />
  </SVGIcon>
);
