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

export const UnderlineIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M5.10588 10.1932C4.38145 9.61625 4.01282 8.76361 4 7.63529V1H6.00982V6.94291C6.00982 7.61606 6.19894 8.14175 6.57718 8.51999C6.94902 8.89824 7.42342 9.08736 8.00041 9.08736C8.57739 9.08736 9.04859 8.89824 9.41401 8.51999C9.78584 8.14175 9.97176 7.61606 9.97176 6.94291V1H11.9816V10.9818H9.97176V9.91436H9.93329C9.27297 10.7029 8.41071 11.0972 7.34649 11.0972C6.51948 11.0844 5.77262 10.783 5.10588 10.1932ZM12.0291 12.9927H4V15H12.0291V12.9927Z" />
  </SVGIcon>
);
