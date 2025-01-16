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

export const CodeBlockIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15 15.125L15 3.875L14 3.875L14 2L17 2L17 17L16 17L2 17L1 17L1 11L3 11L3 15.125L15 15.125Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.13174 1.50391L4.86823 2.49618L3.15173 5.50005L4.86823 8.50391L3.13174 9.49618L0.848231 5.50005L3.13174 1.50391Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.8683 1.50391L9.13177 2.49618L10.8483 5.50005L9.13177 8.50391L10.8683 9.49618L13.1518 5.50005L10.8683 1.50391Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.04446 9.18799L7.0444 0.717374L8.95549 1.28256L6.95555 9.75319L5.04446 9.18799Z"
    />
  </SVGIcon>
);
