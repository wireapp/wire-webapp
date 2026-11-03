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

export const ComputerIcon: FunctionComponent<SVGIconProps> = props => {
  return (
    <SVGIcon realWidth={28} realHeight={28} fill="none" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M6.4165 5.83325H21.5832C22.5497 5.83325 23.3332 6.61675 23.3332 7.58325V16.9166C23.3332 17.8831 22.5497 18.6666 21.5832 18.6666H6.4165C5.45001 18.6666 4.6665 17.8831 4.6665 16.9166V7.58325C4.6665 6.61675 5.45001 5.83325 6.4165 5.83325Z"
        strokeWidth="1.98333"
        stroke="currentColor"
      />
      <path d="M2.3335 22.1667H25.6668" strokeWidth="1.98333" strokeLinecap="round" stroke="currentColor" />
    </SVGIcon>
  );
};
