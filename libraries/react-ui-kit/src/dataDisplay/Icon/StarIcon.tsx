/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

export const StarIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={12} realHeight={12} {...props}>
    <path d="M5.19036 0.612427C5.44371 -0.204142 6.55629 -0.204143 6.80964 0.612426L7.82903 3.89792H11.1477C11.97 3.89792 12.3138 4.98908 11.6505 5.49374L8.95944 7.54121L9.98352 10.8418C10.2364 11.6569 9.33636 12.3313 8.67113 11.8252L6 9.79289L3.32887 11.8252C2.66364 12.3313 1.76358 11.6569 2.01648 10.8418L3.04056 7.54121L0.349516 5.49374C-0.313779 4.98908 0.0299803 3.89792 0.852265 3.89792H4.17097L5.19036 0.612427Z" />
  </SVGIcon>
);
