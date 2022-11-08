/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {COLOR} from '../Identity';

export const RecordBoldIcon = ({color = COLOR.TEXT, ...props}: SVGIconProps) => (
  <SVGIcon realWidth={20} realHeight={16} color={color} {...props}>
    <path fill="none" d="M0 0H24V24H0z" />
    <circle fill="none" cx="10" cy="10" r="9" css={{stroke: color}} strokeWidth="2" />
    <circle
      cx="10"
      cy="10"
      r="4"
      css={{
        fill: color,
        stroke: color,
      }}
      strokeWidth="2"
    />
  </SVGIcon>
);
