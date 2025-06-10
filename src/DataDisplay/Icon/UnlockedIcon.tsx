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

export const UnlockedIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={14} realHeight={14} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.04113 2.56083C6.4216 2.20968 6.95362 2 7.52351 2C8.09341 2 8.62542 2.20968 9.0059 2.56083C9.38367 2.9095 9.57907 3.36441 9.57907 3.82006C9.57907 4.37235 10.0268 4.82006 10.5791 4.82006C11.1314 4.82006 11.5791 4.37235 11.5791 3.82006C11.5791 2.77986 11.1306 1.80019 10.3623 1.09112C9.59676 0.384542 8.57439 0 7.52351 0C6.47264 0 5.45027 0.384542 4.68469 1.09112C3.91641 1.80019 3.46796 2.77986 3.46796 3.82006V7H2.46032C1.35261 7 0.5 7.84726 0.5 8.84022V13.1598C0.5 14.1527 1.35261 15 2.46032 15H11.5397C12.6474 15 13.5 14.1527 13.5 13.1598V8.84022C13.5 7.84726 12.6474 7 11.5397 7H5.46796V3.82006C5.46796 3.36441 5.66335 2.9095 6.04113 2.56083Z"
      fill="currentColor"
    />
  </SVGIcon>
);
