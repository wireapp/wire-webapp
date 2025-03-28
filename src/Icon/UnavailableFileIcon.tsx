/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

export const UnavailableFileIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={13} realHeight={16} {...props}>
    <path
      d="M0.5 2.5C0.5 1.39543 1.39543 0.5 2.5 0.5H10.5C11.6046 0.5 12.5 1.39543 12.5 2.5V11.5063C12.5 12.1626 12.2419 12.7926 11.7815 13.2603L10.3108 14.754C9.84094 15.2312 9.19916 15.5 8.52938 15.5H2.5C1.39543 15.5 0.5 14.6046 0.5 13.5V2.5Z"
      fill="var(--unavailable-file-icon-bg)"
      stroke="var(--unavailable-file-icon-stroke)"
    />
    <path d="M12.5 11.5V11.5C10.2909 11.5 8.5 13.2909 8.5 15.5V15.5" stroke="var(--unavailable-file-icon-stroke)" />
    <path d="M4.5 5.5L8.74264 9.74264" stroke="var(--unavailable-file-icon-stroke)" strokeLinecap="round" />
    <path d="M8.74261 5.5L4.49997 9.74264" stroke="var(--unavailable-file-icon-stroke)" strokeLinecap="round" />
  </SVGIcon>
);
