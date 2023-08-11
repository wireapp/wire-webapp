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

export const CertificateExpiredIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      d="M8.00661 0.778123L14.25 2.44775V8C14.25 11.5269 11.6778 14.3426 8.00089 15.2298C4.35861 14.3417 1.75 11.5234 1.75 8V2.56573L8.00661 0.778123Z"
      stroke="#C20013"
      strokeWidth="1.5"
      strokeMiterlimit="16"
      fill="transparent"
    />
    <rect x="7" y="3.5" width="2" height="5" fill="#C20013" />
    <rect x="7" y="9.5" width="2" height="2" fill="#C20013" />
  </SVGIcon>
);
