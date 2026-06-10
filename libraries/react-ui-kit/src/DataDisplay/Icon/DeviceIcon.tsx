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

export const DeviceIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M11 4h2.4c1 0 1.2.1 1.6.3.3.1.6.4.7.7.2.3.3.7.3 1.6v6.8c0 1-.1 1.2-.3 1.6-.1.3-.4.6-.7.7-.3.2-.7.3-1.6.3H2.6c-1 0-1.2-.1-1.6-.3a1.8 1.8 0 0 1-.7-.7c-.2-.3-.3-.7-.3-1.6V2.6C0 1.6.1 1.4.3 1 .4.7.7.4 1 .3c.4-.2.7-.3 1.6-.3h5.8c1 0 1.2.1 1.6.3.3.1.6.4.7.7.2.4.3.7.3 1.6V4zM9 4V3a1 1 0 0 0-1-1h-.5a.5.5 0 0 0-.5.5.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5.5.5 0 0 0-.5-.5H3a1 1 0 0 0-1 1v9.7l.1.8.4.4.8.1H7a8.2 8.2 0 0 1 0-.6V6.6c0-1 .1-1.3.3-1.6.1-.3.4-.6.7-.7.3-.2.5-.3 1-.3zm1.3 2l-.8.1a.9.9 0 0 0-.4.4l-.1.8v5.4l.1.8.4.4.8.1h2.4l.8-.1a.9.9 0 0 0 .4-.4l.1-.8V7.3l-.1-.8a.9.9 0 0 0-.4-.4l-.8-.1h-2.4z" />
  </SVGIcon>
);
