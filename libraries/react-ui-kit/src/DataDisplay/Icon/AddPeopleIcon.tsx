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

export const AddPeopleIcon = ({...props}: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M12 2V0h2v2h2v2h-2v2h-2V4h-2V2h2zm-2.6 8.6c1.4 0 2.6 1.1 2.6 2.5v1.1a12.8 12.8 0 0 1-12 0v-1c0-1.5 1.2-2.6 2.6-2.6h.3a6 6 0 0 0 6.2 0h.3zM6 8.9A3.4 3.4 0 1 1 6 2a3.4 3.4 0 0 1 0 6.9z" />
  </SVGIcon>
);
