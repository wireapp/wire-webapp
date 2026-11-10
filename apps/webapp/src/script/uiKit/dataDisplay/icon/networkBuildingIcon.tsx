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

export const NetworkBuildingIcon: FunctionComponent<SVGIconProps> = props => {
  return (
    <SVGIcon realWidth={26} realHeight={22} fill="none" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M3.32503 20.825V2.15837C3.32503 1.84895 3.44795 1.5522 3.66674 1.33341C3.88553 1.11462 4.18228 0.991699 4.4917 0.991699H14.9917C15.3011 0.991699 15.5979 1.11462 15.8167 1.33341C16.0354 1.5522 16.1584 1.84895 16.1584 2.15837V6.82503M3.32503 20.825H0.991699M3.32503 20.825H16.1584M16.1584 6.82503V20.825M16.1584 6.82503H20.825C21.1345 6.82503 21.4312 6.94795 21.65 7.16674C21.8688 7.38553 21.9917 7.68228 21.9917 7.9917V20.825M16.1584 20.825H21.9917M21.9917 20.825H24.325M7.9917 5.65837H11.4917M7.9917 10.325H11.4917M7.9917 14.9917H11.4917"
        strokeWidth="1.98333"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
      />
    </SVGIcon>
  );
};
