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

export const TextFileIcon = ({...props}: SVGIconProps) => {
  return (
    <SVGIcon realWidth={14} realHeight={16} fill="none" {...props}>
      <path
        d="M0.5 3.5C0.5 2.39543 1.39543 1.5 2.5 1.5H10.5C11.6046 1.5 12.5 2.39543 12.5 3.5V11.5063C12.5 12.1626 12.2419 12.7926 11.7815 13.2603L10.3108 14.754C9.84094 15.2312 9.19916 15.5 8.52938 15.5H2.5C1.39543 15.5 0.5 14.6046 0.5 13.5V3.5Z"
        fill="var(--text-file-icon-bg)"
        stroke="var(--text-file-icon-stroke)"
      />
      <path d="M12.5 11.5V11.5C10.2909 11.5 8.5 13.2909 8.5 15.5V15.5" stroke="var(--text-file-icon-stroke)" />
      <path d="M7 2L7 1" stroke="var(--text-file-icon-stroke)" strokeLinecap="round" />
      <path d="M11 2L11 1" stroke="var(--text-file-icon-stroke)" strokeLinecap="round" />
      <path d="M5 2L5 1" stroke="var(--text-file-icon-stroke)" strokeLinecap="round" />
      <path d="M9 2L9 1" stroke="var(--text-file-icon-stroke)" strokeLinecap="round" />
      <path d="M3 2L3 1" stroke="var(--text-file-icon-stroke)" strokeLinecap="round" />
      <path d="M3 5H9" stroke="var(--text-file-icon-stroke)" strokeLinecap="round" />
      <path d="M3 8H9" stroke="var(--text-file-icon-stroke)" strokeLinecap="round" />
      <path d="M3 11H6" stroke="var(--text-file-icon-stroke)" strokeLinecap="round" />
    </SVGIcon>
  );
};
