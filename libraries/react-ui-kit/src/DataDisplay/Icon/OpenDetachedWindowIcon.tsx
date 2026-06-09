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

export const OpenDetachedWindowIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 1C7.44772 1 7 1.44772 7 2V6C7 6.55228 7.44772 7 8 7H14C14.5523 7 15 6.55228 15 6V2C15 1.44772 14.5523 1 14 1H8ZM0.66947 3.58579C1.0831 3.22386 1.65453 3 2.28571 3H5V5H2V13H12V9H14V13C14 14.1046 12.9767 15 11.7143 15H2.28571C1.02335 15 0 14.1046 0 13V5C0 4.96548 0.000999365 4.93117 0.00297416 4.89708C0.0218406 4.57141 0.129736 4.2663 0.305788 4C0.406153 3.84819 0.52867 3.70899 0.66947 3.58579Z"
    />
  </SVGIcon>
);
