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

import {SVGIcon, SVGIconProps} from '../SVGIcon';

export const MultipleFilesIcon = ({...props}: SVGIconProps) => {
  return (
    <SVGIcon realWidth={13} realHeight={16} fill="none" {...props}>
      <path
        fill="var(--multiple-file-icon-bg)"
        stroke="var(--multiple-file-icon-stroke)"
        d="M5.498 2.538c0-.573.465-1.038 1.038-1.038h4.923c.574 0 1.039.465 1.039 1.038v5.543c0 .353-.14.692-.387.944l-.905.92a1.346 1.346 0 0 1-.96.401h-3.71a1.039 1.039 0 0 1-1.038-1.038v-6.77Z"
      />
      <path
        stroke="var(--multiple-file-icon-stroke)"
        d="M11.998 8.077a1.926 1.926 0 0 0-2 1.923M3.498 4.5v6.461c0 .85.689 1.539 1.538 1.539h4.462"
      />
      <path stroke="var(--multiple-file-icon-stroke)" d="M1.498 7.5v5.461c0 .85.689 1.539 1.538 1.539h4.462" />
    </SVGIcon>
  );
};
