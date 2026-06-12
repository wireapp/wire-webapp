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

export const RaiseHandIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.99.793C9.926.345 9.507 0 9 0c-.552 0-1 .41-1 .917V7a.5.5 0 0 1-1 0V1.917l-.01-.124C6.926 1.345 6.507 1 6 1c-.552 0-1 .41-1 .917V7.09A.5.5 0 0 1 4.008 7L4 6.999V3.923l-.01-.125C3.926 3.348 3.507 3 3 3c-.552 0-1 .413-1 .923v6.154l.004.055V12h.002l.003.13c.096 1.744 1.51 3.144 3.28 3.255h4.738c1.054 0 1.87-.512 2.446-1.537l3.22-4.073.094-.107a1.035 1.035 0 0 0-.093-1.363 1.051 1.051 0 0 0-1.48 0l-1.147 1.138c-.064.07-.233.254-.467.487-1.552-.033-2.592 1.307-2.6 2.398v.062c0 .337-.16.544-.5.544-.34 0-.5-.213-.5-.551 0-1.451 1-3.454 4-3.454l.004.02V7l-.005-.001L13 1.917l-.01-.124C12.926 1.345 12.507 1 12 1c-.552 0-1 .41-1 .917V7a.5.5 0 0 1-1 0V.917L9.99.793Z"
    />
  </SVGIcon>
);
