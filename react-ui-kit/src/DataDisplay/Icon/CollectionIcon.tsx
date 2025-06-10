/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

export const CollectionIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.75065 0C2.33346 0 1.99999 0.335786 1.99999 0.75V1.5H14V0.75C14 0.332899 13.6639 0 13.2493 0H2.75065ZM0.999992 3.75C0.999992 3.33579 1.33225 3 1.75269 3H14.2473C14.663 3 15 3.3329 15 3.75V4.5H0.999992V3.75ZM0.0995315 6.9954C0.0445572 6.44565 0.444623 6 1.00086 6H14.9991C15.5519 6 15.9557 6.44259 15.9005 6.9954L15 16H0.999992L0.0995315 6.9954Z"
    />
  </SVGIcon>
);
