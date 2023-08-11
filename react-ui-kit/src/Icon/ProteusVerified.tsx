/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

export const ProteusVerified = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15 1.87197V8C15 12 12.0344 15.0977 8 16C4.00718 15.0977 1 12 1 8V2L8 0L15 1.87197Z"
      fill="#0552A0"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 16C4.00718 15.0977 1 12 1 8V2L8 0C8 0 8 13 8 16Z"
      fill="#6AA4DE"
    />
  </SVGIcon>
);
