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

export const SettingsIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M2.8 11a6 6 0 0 1-.6-1.5H0v-3h2.2c.1-.6.3-1 .6-1.5L1.3 3.4l2.1-2.1L5 2.8a6 6 0 0 1 1.5-.6V0h3v2.2c.6.1 1 .3 1.5.6l1.6-1.5 2.1 2.1L13.2 5c.3.4.5 1 .6 1.5H16v3h-2.2a6 6 0 0 1-.6 1.5l1.5 1.6-2.1 2.1-1.6-1.5a6 6 0 0 1-1.5.6V16h-3v-2.2a6 6 0 0 1-1.5-.6l-1.6 1.5-2.1-2.1L2.8 11zM8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
  </SVGIcon>
);
