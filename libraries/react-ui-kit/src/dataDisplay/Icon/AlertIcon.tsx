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

export const AlertIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      d="M.34 12.49 6.054 1.389C6.425.666 7.08-.003 8.004 0c.92.003 1.57.673 1.939 1.388l5.715 11.103c.393.766.5 1.667.037 2.428-.464.763-1.315 1.081-2.18 1.081H2.482c-.869 0-1.715-.325-2.177-1.086-.46-.758-.36-1.658.035-2.423Zm1.752 1.442a.93.93 0 0 0 .39.068h11.033c.204 0 .33-.037.397-.068.061-.028.074-.052.075-.053 0-.001.015-.024.013-.091a.95.95 0 0 0-.12-.382L8.164 2.303a1.194 1.194 0 0 0-.166-.252 1.202 1.202 0 0 0-.166.252L2.118 13.407A.927.927 0 0 0 2 13.78c-.002.067.013.092.015.095.002.004.016.028.077.056Z"
      fillRule="evenodd"
      clipRule="evenodd"
    />
    <path d="M7 5h2v5H7zM7 11h2v2H7z" />
  </SVGIcon>
);
