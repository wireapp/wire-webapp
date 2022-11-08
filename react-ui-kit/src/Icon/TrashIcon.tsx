/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

export const TrashIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={14} realHeight={16} {...props}>
    <path d="M5 2H1a1 1 0 0 0-1 1v1h14V3a1 1 0 0 0-1-1H9a2 2 0 1 0-4 0zM1 6h12l-.8 8c-.11 1.1-1.09 2-2.2 2H4c-1.1 0-2.09-.89-2.2-2L1 6z" />
  </SVGIcon>
);
