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

export const FunnelFilterIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0.0675604 1.43434C0.18673 1.16947 0.444136 1 0.727282 1H15.2727C15.5559 1 15.8133 1.16947 15.9324 1.43434C16.0516 1.69922 16.0109 2.01134 15.828 2.23429L10.1818 9.11961V15.25C10.1818 15.5099 10.0513 15.7513 9.83689 15.888C9.62248 16.0246 9.35474 16.0371 9.1293 15.9208L6.22021 14.4208C5.97382 14.2938 5.81818 14.0341 5.81818 13.75V9.11961L0.171959 2.23429C-0.0108757 2.01134 -0.0516092 1.69922 0.0675604 1.43434ZM2.29477 2.5L7.10078 8.36071C7.21181 8.4961 7.27273 8.66768 7.27273 8.845V13.2865L8.72727 14.0365V8.845C8.72727 8.66768 8.78819 8.4961 8.89922 8.36071L13.7052 2.5H2.29477Z"
    />
  </SVGIcon>
);
