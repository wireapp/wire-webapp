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

export const LinkIcon = ({...props}: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M10.2129 0C7.91857 0 5.93605 1.32664 5 3.25H7.39978C8.09086 2.48281 9.09515 2 10.2129 2C12.2974 2 13.9871 3.67893 13.9871 5.75C13.9871 7.82107 12.2974 9.5 10.2129 9.5C9.09515 9.5 8.09086 9.01719 7.39978 8.25H5C5.93605 10.1734 7.91857 11.5 10.2129 11.5C13.409 11.5 16 8.92564 16 5.75C16 2.57436 13.409 0 10.2129 0ZM5.78707 4.5C8.08143 4.5 10.064 5.82664 11 7.75H8.60022C7.90914 6.98281 6.90485 6.5 5.78707 6.5C3.70265 6.5 2.01289 8.17893 2.01289 10.25C2.01289 12.3211 3.70265 14 5.78707 14C6.90485 14 7.90914 13.5172 8.60022 12.75H11C10.064 14.6734 8.08143 16 5.78707 16C2.59096 16 0 13.4256 0 10.25C0 7.07436 2.59096 4.5 5.78707 4.5Z" />
  </SVGIcon>
);
