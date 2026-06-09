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

export const ErrorIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={13} realHeight={12} {...props}>
    <g transform="translate(.5 .333)" fill="none" fillRule="evenodd">
      <circle fill="#E02020" cx="6" cy="6" r="6" />
      <text fontFamily="SFProText-Heavy, SF Pro Text" fontSize="9" fontWeight="600" fill="#FFF">
        <tspan x="4.291" y="9">
          !
        </tspan>
      </text>
    </g>
  </SVGIcon>
);
