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
    <SVGIcon realWidth={13} realHeight={16} fill="none" {...props}>
      <path
        d="M2.5 1.5H10.5C11.6046 1.5 12.5 2.39543 12.5 3.5V11.5059C12.5 12.0801 12.3021 12.6343 11.9443 13.0771L11.7812 13.2607L10.3105 14.7539C9.84065 15.2311 9.19902 15.5 8.5293 15.5H2.5C1.39543 15.5 0.5 14.6046 0.5 13.5V3.5C0.5 2.39543 1.39543 1.5 2.5 1.5Z"
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
