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

export const TeamIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={28} realHeight={31} {...props}>
    <path d="M4.32 9.65V21.2l9.82 5.82 9.82-5.8V9.64l-9.82-5.82-9.82 5.82zM12.54.4c.9-.53 2.33-.53 3.2 0l10.3 6.1c.9.5 1.6 1.8 1.6 2.83v12.2c0 1.04-.72 2.32-1.6 2.84l-10.3 6.1c-.88.52-2.32.5-3.2 0l-10.3-6.1c-.88-.52-1.6-1.8-1.6-2.85V9.32c0-1.04.73-2.3 1.6-2.83L12.54.4z" />
  </SVGIcon>
);
