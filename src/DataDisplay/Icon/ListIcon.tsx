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

export const ListIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={14} realHeight={11} {...props}>
    <path d="M4 6h10v2H4V6zm0-6h10v2H4V0zm10 12v2H4v-2h10zM2 12v2H0v-2h2zm0-6v2H0V6h2zm0-6v2H0V0h2z" />
  </SVGIcon>
);
