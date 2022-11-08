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

export const OptionsIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M9.7 15H15a1 1 0 1 0 0-2H9.7a2 2 0 0 0-3.4 0H1a1 1 0 1 0 0 2h5.3a2 2 0 0 0 3.4 0zm-3-6H15a1 1 0 1 0 0-2H6.7a2 2 0 0 0-3.4 0H1a1 1 0 1 0 0 2h2.3a2 2 0 0 0 3.4 0zm6-6H15a1 1 0 1 0 0-2h-2.3a2 2 0 0 0-3.4 0H1a1 1 0 1 0 0 2h8.3a2 2 0 0 0 3.4 0z" />
  </SVGIcon>
);
