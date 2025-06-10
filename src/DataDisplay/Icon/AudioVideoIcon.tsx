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

export const AudioVideoIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M0 1c0-.6.4-1 1-1h14c.6 0 1 .4 1 1v11c0 .6-.4 1-1 1H1a1 1 0 0 1-1-1V1zm5 13h6v2H5v-2zm-3-4v1h3v-1H2zm0-2v1h3V8H2zm0-2v1h3V6H2zm0-2v1h3V4H2zm4.5 6v1h3v-1h-3zm0-2v1h3V8h-3zm4.5 2v1h3v-1h-3zm0-2v1h3V8h-3zm0-2v1h3V6h-3z" />
  </SVGIcon>
);
