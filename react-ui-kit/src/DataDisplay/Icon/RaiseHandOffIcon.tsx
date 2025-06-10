/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

export const RaiseHandOffIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.111 15.17 2 6.055v4.02l.004.056V12h.002l.003.13c.096 1.744 1.51 3.144 3.28 3.255h4.738a2.67 2.67 0 0 0 1.084-.216ZM9.991.792C9.925.345 9.506 0 9 0c-.552 0-1 .41-1 .917V7a.5.5 0 0 1-.446.497L7 6.944V1.917l-.01-.124C6.926 1.345 6.507 1 6 1c-.552 0-1 .41-1 .917v3.026l-1-1v-.02l-.01-.125c-.063-.433-.452-.771-.932-.796L1.056 1 0 2.056 13.944 16 15 14.944l-1.895-1.895 2.588-3.274.094-.107a1.035 1.035 0 0 0-.093-1.363 1.051 1.051 0 0 0-1.48 0l-1.21 1.2V7l-.005-.001L13 1.917l-.01-.124C12.926 1.345 12.507 1 12 1c-.552 0-1 .41-1 .917V7a.5.5 0 0 1-1 0V.917L9.99.793Z"
    />
  </SVGIcon>
);
