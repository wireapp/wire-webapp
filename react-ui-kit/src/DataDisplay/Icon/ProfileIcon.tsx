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

export const ProfileIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={31} realHeight={31} {...props}>
    <path d="M15.43 30.86C6.9 30.86 0 23.96 0 15.43S6.9 0 15.43 0c8.52 0 15.43 6.9 15.43 15.43 0 8.52-6.9 15.43-15.43 15.43zM3.86 15.43c0 2.9 1.07 5.56 2.84 7.6l.15-.88c.28-1.58 1.8-2.86 3.4-2.86H20.6c1.6 0 3.1 1.2 3.4 2.8l.14.84c1.8-2 2.86-4.7 2.86-7.6C27 9 21.82 3.84 15.43 3.84 9.03 3.83 3.86 9 3.86 15.4zm11.57 1.93c-2.66 0-4.82-2.16-4.82-4.82 0-2.67 2.2-4.83 4.9-4.83s4.8 2.2 4.8 4.9-2.14 4.8-4.8 4.8z" />
  </SVGIcon>
);
