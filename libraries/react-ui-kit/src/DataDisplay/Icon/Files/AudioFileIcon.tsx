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

export const AudioFileIcon = ({...props}: SVGIconProps) => {
  return (
    <SVGIcon realWidth={13} realHeight={16} fill="none" {...props}>
      <path
        fill="var(--audio-file-icon-bg)"
        stroke="var(--audio-file-icon-stroke)"
        d="M1 2.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9.006a2.5 2.5 0 0 1-.719 1.754l-1.47 1.494a2.5 2.5 0 0 1-1.782.746H3a2 2 0 0 1-2-2v-11Z"
      />
      <path stroke="var(--audio-file-icon-stroke)" d="M13 11.5a4 4 0 0 0-4 4" />
      <path fill="var(--audio-file-icon-stroke)" d="M5.5 4.5A.5.5 0 0 1 6 5v4.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z" />
      <circle cx="4.5" cy="9.5" r="1" stroke="var(--audio-file-icon-stroke)" />
      <path fill="var(--audio-file-icon-stroke)" d="M9.5 3.5a.5.5 0 0 1 .5.5v4.5a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5Z" />
      <circle cx="8.5" cy="8.5" r="1" stroke="var(--audio-file-icon-stroke)" />
      <path
        fill="var(--audio-file-icon-stroke)"
        d="M9.985 3.879a.5.5 0 0 1-.364.606l-4 1a.5.5 0 0 1-.242-.97l4-1a.5.5 0 0 1 .606.364Z"
      />
    </SVGIcon>
  );
};
