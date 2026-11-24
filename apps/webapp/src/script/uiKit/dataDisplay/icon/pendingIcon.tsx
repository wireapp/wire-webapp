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

export const PendingIcon: FunctionComponent<SVGIconProps> = props => {
  return (
    <SVGIcon realWidth={12} realHeight={12} {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 0C9.31371 0 12 2.68629 12 6C12 9.25119 9.41412 11.8984 6.18688 11.9971L6 12C2.68629 12 0 9.31371 0 6C0 2.68629 2.68629 0 6 0ZM6 1.5C3.51472 1.5 1.5 3.51472 1.5 6C1.5 8.4288 3.42418 10.4082 5.8313 10.4969L6 10.5C8.48528 10.5 10.5 8.48528 10.5 6C10.5 3.51472 8.48528 1.5 6 1.5ZM6.75 2.25V5.25H9V6.75H5.25V2.25H6.75Z"
      />
    </SVGIcon>
  );
};
