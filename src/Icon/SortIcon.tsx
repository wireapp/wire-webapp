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

export const SortIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.64562 10.7775L4.27329 15.0925L0 10.8563L1.29415 9.55083L4.27619 12.507L7.35439 9.46912L8.64562 10.7775Z"
    />
    <path fillRule="evenodd" clipRule="evenodd" d="M3.40442 13.7998V0.0130615H5.24265V13.7998H3.40442Z" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.29603 4.31504L11.6684 -5.61879e-06L15.9417 4.23622L14.6475 5.54169L11.6655 2.58553L8.58726 5.62341L7.29603 4.31504Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.5372 1.29272L12.5372 15.0795L10.699 15.0795L10.699 1.29272L12.5372 1.29272Z"
    />
  </SVGIcon>
);
