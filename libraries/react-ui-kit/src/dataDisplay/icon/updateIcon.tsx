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

import {SVGIcon, SVGIconProps} from './svgIcon';

/** Two arrows turning around each other. Used when call encryption keys are updated. */
export const UpdateIcon = (props: SVGIconProps) => {
  return (
    <SVGIcon realWidth={12} realHeight={12} {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.75732 10.2426C2.84317 11.3284 4.34317 12 6 12C9.31371 12 12 9.31371 12 6H10.5C10.5 8.48528 8.48528 10.5 6 10.5C4.75736 10.5 3.63232 9.99632 2.81805 9.18198L5.25 6.75L0 6.75V12L1.75732 10.2426Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.2426 1.75732C9.15686 0.67155 7.65686 0 6 0C2.68627 0 0 2.68628 0 6L1.5 6C1.5 3.51472 3.51472 1.5 6 1.5C7.24264 1.5 8.36764 2.0037 9.18198 2.81805L6.75 5.25L12 5.25L12 0L10.2426 1.75732Z"
      />
    </SVGIcon>
  );
};
