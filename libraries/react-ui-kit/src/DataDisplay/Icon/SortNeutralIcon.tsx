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

export const SortNeutralIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={14} realHeight={14} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.7451 9.7373L12.25 8.2334L13.1777 9.16113L10.0889 12.25L7 9.16113L7.92773 8.2334L9.43262 9.7373V2.13477H10.7451V9.7373Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.30762 4.64648L1.80273 6.15137L0.875001 5.22363L3.96387 2.13477L7.05273 5.22363L6.125 6.15137L4.62012 4.64648L4.62012 12.25L3.30762 12.25L3.30762 4.64648Z"
    />
  </SVGIcon>
);
