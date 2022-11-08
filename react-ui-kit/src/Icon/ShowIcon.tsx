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

export const ShowIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={10} {...props}>
    <path d="M8 0C4.667 0 1.82 2.073.667 5c1.153 2.927 4 5 7.333 5s6.18-2.073 7.333-5c-1.153-2.927-4-5-7.333-5zm0 8.333a3.334 3.334 0 010-6.666 3.334 3.334 0 010 6.666zM8 3c-1.107 0-2 .893-2 2s.893 2 2 2 2-.893 2-2-.893-2-2-2z" />
  </SVGIcon>
);
