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

export const CertificateRevoked = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15 8V1.87197L8 0L1 2V8C1 12 4.00718 15.0977 8 16C12.0344 15.0977 15 12 15 8ZM8 9.27467L5.27467 12L4 10.7253L6.72533 8L4 5.27467L5.27467 4L8 6.72533L10.7253 4L12 5.27467L9.27467 8L12 10.7253L10.7253 12L8 9.27467Z"
      fill="#C20013"
    />
  </SVGIcon>
);
