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

export const OutlineCheck = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fill="#676B71"
      fillRule="evenodd"
      d="M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Zm2 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-8.659 3.27 5.128-5.127-1.414-1.415-4.42 4.421-1.69-1.69-1.414 1.415 2.396 2.396.707.708.707-.708Z"
      clipRule="evenodd"
    />
  </SVGIcon>
);
