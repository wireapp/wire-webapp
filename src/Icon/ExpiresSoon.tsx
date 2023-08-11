/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

export const ExpiresSoon = (props: SVGIconProps) => (
  <SVGIcon realWidth={17} realHeight={18} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15 2.87197V9C15 13 12.0344 16.0977 8 17C4.00718 16.0977 1 13 1 9V3L8 1L15 2.87197Z"
      stroke="#1D7833"
      strokeWidth="1.5"
      strokeMiterlimit="3.62796"
      strokeDasharray="1 1"
      fill="transparent"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.85214 13L13 6.34572L11.7691 5L6.85214 10.3086L4.23094 7.50033L3 8.84605L6.85214 13Z"
      fill="#1D7833"
    />
  </SVGIcon>
);
