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

export const GifIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={13} {...props}>
    <path d="M12 7.2v5h-2V.2h6v2h-4v3h3v2h-3zm-5-7h2v12H7V.2zm-2 5h1v4.2a3 3 0 0 1-6 0V3a3 3 0 0 1 6 0v.2H4V3c0-.5-.5-1-1-1a1 1 0 0 0-1 1v6.4c0 .5.5 1 1 1 .6 0 1-.4 1-1V7.2H3v-2h2z" />
  </SVGIcon>
);
