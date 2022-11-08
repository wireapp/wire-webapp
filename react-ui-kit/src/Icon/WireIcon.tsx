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

export const WireIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={14} {...props}>
    <path d="M10.89 13.35c2.82 0 5.11-2.3 5.11-5.13V.44h-1.88v7.78a3.23 3.23 0 0 1-5.16 2.62l.08.72a5.2 5.2 0 0 0 1.22-3.34V2.26a2.27 2.27 0 0 0-4.53 0v5.96c0 1.25.46 2.4 1.27 3.35l.1-.73a3.26 3.26 0 0 1-5.2-2.62L1.86.94v-.5H0v7.78a5.15 5.15 0 0 0 8.35 4.04h-.62c.89.7 2 1.1 3.16 1.1zM8.39 2.26v5.96c0 .76-.28 1.5-.77 2.09l.76-.01a3.16 3.16 0 0 1-.76-2.08V2.26c0-.2.17-.38.38-.38.2 0 .38.18.38.38z" />
  </SVGIcon>
);
