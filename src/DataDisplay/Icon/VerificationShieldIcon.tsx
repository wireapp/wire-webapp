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

export const VerificationShieldIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={14} realHeight={17} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13.4085 8.81445V2.68642L6.70423 0.814453L0 2.81445V8.81445C0 12.8145 2.88011 15.9122 6.70423 16.8145C10.5681 15.9122 13.4085 12.8145 13.4085 8.81445ZM11.493 6.16017L5.60492 12.8145L1.91554 8.6605L3.09447 7.31478L5.60492 10.123L10.3141 4.81445L11.493 6.16017Z"
      color={props.color ?? 'black'}
    />
  </SVGIcon>
);
