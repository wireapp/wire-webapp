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

/** @jsx jsx */
import {jsx} from '@emotion/core';

import {SVGIcon, SVGIconProps} from './SVGIcon';

export const RecordBoldIcon = ({color, ...props}: SVGIconProps) => (
  <SVGIcon realWidth={20} realHeight={18} color={color} {...props}>
    <path fill="none" d="M0 0H24V24H0z" />
    <circle
      fill="none"
      cx="10"
      cy="10"
      r="9"
      css={theme => ({
        stroke: theme.general.color || color,
      })}
      strokeWidth="2"
    />
    <circle
      cx="10"
      cy="10"
      r="4"
      css={theme => ({
        fill: theme.general.color || color,
        stroke: theme.general.color || color,
      })}
      strokeWidth="2"
    />
  </SVGIcon>
);
