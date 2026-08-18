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

export const LockClosedIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={10} realHeight={10} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.0862 2.20831C4.32074 1.9912 4.64869 1.86155 5 1.86155C5.35131 1.86155 5.67926 1.9912 5.9138 2.20831C6.14667 2.42388 6.26712 2.70514 6.26712 2.98686V4.375H3.73288V2.98686C3.73288 2.70514 3.85333 2.42388 4.0862 2.20831ZM2.5 4.375V2.98686C2.5 2.34372 2.77644 1.73801 3.25004 1.29961C3.72197 0.862753 4.3522 0.625 5 0.625C5.6478 0.625 6.27803 0.862753 6.74996 1.29961C7.22356 1.73801 7.5 2.34372 7.5 2.98686V4.375H7.8373C8.52962 4.375 9.0625 4.90454 9.0625 5.52514V8.22486C9.0625 8.84546 8.52962 9.375 7.8373 9.375H2.1627C1.47038 9.375 0.9375 8.84546 0.9375 8.22486V5.52514C0.9375 4.90454 1.47038 4.375 2.1627 4.375H2.5Z"
      fill="currentColor"
    />
  </SVGIcon>
);
