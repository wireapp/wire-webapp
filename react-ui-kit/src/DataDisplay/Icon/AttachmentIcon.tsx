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

export const AttachmentIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={14} realHeight={16} {...props}>
    <path d="M1.6 7.7l4.8-4.8A3.3 3.3 0 0 1 11 3a3.4 3.4 0 0 1 0 4.8L9.8 9.1l-4.4 4.4a2 2 0 0 1-2.8 0 2 2 0 0 1 0-2.7L4 9.4 8.4 5c.2-.2.5-.2.7 0 .2.2.2.5 0 .6l-4.8 4.8a1 1 0 0 0 0 1.4c.4.4 1 .4 1.4 0L10.4 7c1-1 1-2.5 0-3.4-1-1-2.4-1-3.3 0L2.6 8 1.3 9.4a3.9 3.9 0 0 0 0 5.5c1.5 1.5 4 1.5 5.4 0l4.4-4.5 1.4-1.3c2-2.1 2-5.5 0-7.5a5.3 5.3 0 0 0-7.5 0L.3 6.3a1 1 0 0 0 0 1.4c.4.4 1 .4 1.3 0z" />
  </SVGIcon>
);
