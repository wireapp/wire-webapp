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

export const CamIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={12} {...props}>
    <path d="M2.6 0h4.8c1 0 1.3 0 1.6.3.3.1.6.4.7.7.2.3.3.7.3 1.6v6.8c0 1 0 1.3-.3 1.6-.1.3-.4.6-.7.7-.3.2-.7.3-1.6.3H2.6c-1 0-1.3 0-1.6-.3-.3-.1-.6-.4-.7-.7-.2-.3-.3-.7-.3-1.6V2.6c0-1 0-1.3.3-1.6C.4.7.7.4 1 .3c.3-.2.7-.3 1.6-.3zm8.7 5.3l3-3A1 1 0 0 1 16 3v6a1 1 0 0 1-1.7.7l-3-3a1 1 0 0 1 0-1.4z" />
  </SVGIcon>
);
