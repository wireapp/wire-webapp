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

export const ArchiveFileIcon = ({...props}: SVGIconProps) => {
  return (
    <SVGIcon realWidth={14} realHeight={16} fill="none" {...props}>
      <path
        fill="var(--archive-file-icon-bg)"
        stroke="var(--archive-file-icon-stroke)"
        d="M.996 2.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9.006a2.5 2.5 0 0 1-.719 1.754l-1.47 1.494a2.5 2.5 0 0 1-1.782.746h-6.03a2 2 0 0 1-2-2v-11Z"
      />
      <path stroke="var(--archive-file-icon-stroke)" d="M12.996 11.5a4 4 0 0 0-4 4" />
      <path fill="var(--archive-file-icon-stroke)" d="M3.496 8.5a.5.5 0 1 0 1 0h-1Zm0-8v8h1v-8h-1Z" />
      <path
        stroke="var(--archive-file-icon-stroke)"
        d="M5.496 2h-1M3.496 3h-1M5.496 4h-1M3.496 5h-1M5.496 6h-1M3.496 7h-1"
      />
    </SVGIcon>
  );
};
