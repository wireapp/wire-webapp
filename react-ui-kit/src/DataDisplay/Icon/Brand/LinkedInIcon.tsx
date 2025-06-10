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

import {SVGIcon, SVGIconProps} from '../SVGIcon';

export const LinkedInIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M.333 5.333v10.334h3.334V5.333H.333zM9 9.667c0-1.334.852-2 1.852-2s1.815.666 1.815 2.333v5.667H16v-6C16 6.667 14.333 5 12 5c-1.333 0-2.333.76-3 1.76l-.111-1.427H5.61c0 .352.056 2.334.056 2.334v8H9v-6zm-7.019-6C3.222 3.667 4 2.852 4 1.833 3.981.796 3.222 0 2.019 0 .796 0 0 .796 0 1.833c0 1.019.778 1.834 1.963 1.834h.018z" />
  </SVGIcon>
);
