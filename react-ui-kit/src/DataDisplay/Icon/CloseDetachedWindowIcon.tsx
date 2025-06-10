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

export const CloseDetachedWindowIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.28571 1C1.65453 1 1.0831 1.22386 0.66947 1.58579C0.52867 1.70899 0.406153 1.84819 0.305788 2C0.129736 2.2663 0.0218406 2.57141 0.00297416 2.89708C0.000999365 2.93117 0 2.96548 0 3V13C0 14.1046 1.02335 15 2.28571 15H13.7143C14.9767 15 16 14.1046 16 13L16 3C16 1.89543 14.9767 1 13.7143 1H2.28571ZM2 8V3L14 3V13L9 13V9C9 8.44772 8.55229 8 8 8H2Z"
    />
  </SVGIcon>
);
