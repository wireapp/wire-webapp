/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

export const ArchiveIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M1 7h14v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7zm6 2a1 1 0 1 0 0 2h2a1 1 0 0 0 0-2H7zM2.5 0h11c.8 0 1.2 0 1.5.3.3.1.6.4.7.7.2.3.3.7.3 1.5V4c0 .6-.4 1-1 1H1a1 1 0 0 1-1-1V2.5C0 1.7 0 1.3.3 1 .4.7.7.4 1 .3c.3-.2.7-.3 1.5-.3z" />
  </SVGIcon>
);
