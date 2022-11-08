/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

export const LinkIcon = ({...props}: SVGIconProps) => (
  <SVGIcon realWidth={12} realHeight={10} {...props}>
    <path d="M7.66.185c-1.721 0-3.208.995-3.91 2.438h1.8a2.832 2.832 0 0 1 2.11-.938c1.563 0 2.83 1.26 2.83 2.813A2.822 2.822 0 0 1 7.66 7.31a2.832 2.832 0 0 1-2.11-.937h-1.8A4.343 4.343 0 0 0 7.66 8.81c2.397 0 4.34-1.93 4.34-4.312C12 2.116 10.057.185 7.66.185ZM4.34 3.56c1.721 0 3.208.995 3.91 2.438h-1.8a2.832 2.832 0 0 0-2.11-.938 2.822 2.822 0 0 0-2.83 2.813 2.822 2.822 0 0 0 2.83 2.812c.839 0 1.592-.362 2.11-.937h1.8a4.343 4.343 0 0 1-3.91 2.437c-2.397 0-4.34-1.93-4.34-4.312C0 5.49 1.943 3.56 4.34 3.56Z" />
  </SVGIcon>
);
