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

export const TimedIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={15} realHeight={16} {...props}>
    <path d="M7.44 2v1.08a6.48 6.48 0 0 1 5.45 6.42c0 3.59-2.89 6.5-6.45 6.5A6.47 6.47 0 0 1 0 9.5a6.48 6.48 0 0 1 5.45-6.42V2h-.5a1 1 0 0 1-.98-1 1 1 0 0 1 .99-1h2.97a1 1 0 0 1 1 1 1 1 0 0 1-1 1h-.5zm-1 12a4.48 4.48 0 0 0 4.47-4.5c0-2.49-2-4.5-4.47-4.5a4.48 4.48 0 0 0-4.46 4.5c0 2.49 2 4.5 4.46 4.5zm0-1a3.49 3.49 0 0 1-3.47-3.5C2.97 7.57 4.53 6 6.44 6v3.5l2.47 2.47A3.44 3.44 0 0 1 6.44 13zm6.57-10.3l.7.71a1 1 0 0 1 0 1.42.99.99 0 0 1-1.4 0l-.7-.7a1 1 0 0 1 0-1.42.99.99 0 0 1 1.4 0z" />
  </SVGIcon>
);
