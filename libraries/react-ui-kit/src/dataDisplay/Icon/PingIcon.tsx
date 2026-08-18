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

export const PingIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M5.95 4.27a1.02 1.02 0 0 0 1.96-.52l-.8-3a1.02 1.02 0 1 0-1.96.53l.8 3zm4.1 7.46a1.02 1.02 0 0 0-1.96.52l.8 3a1.02 1.02 0 1 0 1.96-.53l-.8-3zM3.75 7.9a1.02 1.02 0 0 0 .52-1.96l-2.99-.8A1.02 1.02 0 1 0 .75 7.1l3 .8zm8.5.18a1.02 1.02 0 1 0-.52 1.96l2.99.8a1.02 1.02 0 0 0 .53-1.96l-3-.8zM5.8 11.64a1.02 1.02 0 1 0-1.44-1.44l-2.2 2.2a1.02 1.02 0 1 0 1.45 1.43l2.19-2.19zm4.4-7.28a1.02 1.02 0 1 0 1.44 1.44l2.2-2.2a1.02 1.02 0 0 0-1.45-1.43L10.2 4.36z" />
  </SVGIcon>
);
