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

export const ImageFileIcon = ({...props}: SVGIconProps) => {
  return (
    <SVGIcon realWidth={14} realHeight={16} fill="none" {...props}>
      <path
        fill="var(--image-file-icon-bg)"
        stroke="var(--image-file-icon-stroke)"
        d="M.996 2.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9.006a2.5 2.5 0 0 1-.719 1.754l-1.47 1.494a2.5 2.5 0 0 1-1.782.746h-6.03a2 2 0 0 1-2-2v-11Z"
      />
      <path stroke="var(--image-file-icon-stroke)" d="M12.996 11.5a4 4 0 0 0-4 4" />
      <circle cx="6.496" cy="4.5" r="1" fill="var(--image-file-icon-bg)" stroke="var(--image-file-icon-stroke)" />
      <path
        fill="var(--image-file-icon-bg)"
        stroke="var(--image-file-icon-stroke)"
        d="M6.33 10.25 8.497 6.5l2.165 3.75H6.33ZM3.697 10.25 4.996 8l1.299 2.25H3.697Z"
      />
    </SVGIcon>
  );
};
