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

export const DocumentFileIcon = ({...props}: SVGIconProps) => {
  return (
    <SVGIcon realWidth={14} realHeight={16} fill="none" {...props}>
      <path
        fill="var(--document-file-icon-bg)"
        stroke="var(--document-file-icon-stroke)"
        d="M.999 2.498a2 2 0 0 1 2-2h7.998a2 2 0 0 1 2 2v9.005a2.5 2.5 0 0 1-.719 1.754l-1.47 1.493a2.5 2.5 0 0 1-1.781.746H2.998a2 2 0 0 1-2-2V2.498Z"
      />
      <path
        stroke="var(--document-file-icon-stroke)"
        d="M4.498 4.999h5M4.498 6.998h5M4.498 8.998h3.5M12.997 11.497a4 4 0 0 0-4 4"
      />
    </SVGIcon>
  );
};
