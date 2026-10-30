/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {FunctionComponent} from 'react';

import {SVGIcon, SVGIconProps} from './svgIcon';

export const ErrorStatusIcon: FunctionComponent<SVGIconProps> = props => {
  return (
    <SVGIcon realWidth={20} realHeight={20} color="#C20013" aria-hidden="true" focusable="false" {...props}>
      <path d="M10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z" />
      <path
        d="M7 7L10 10M10 10L13 13M10 10L13 7M10 10L7 13"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        stroke="white"
      />
    </SVGIcon>
  );
};
