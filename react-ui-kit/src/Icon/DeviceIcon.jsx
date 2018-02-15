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

import IconHOC from './IconHOC';
import React from 'react';

const size = 16;
const device = (
  <path d="M11 0H1a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-3V1a1 1 0 0 0-1-1zm-1 5H9a1 1 0 0 0-1 1v8H2.5a.5.5 0 0 1-.5-.5v-11c0-.28.23-.5.5-.5h7c.28 0 .5.23.5.5V5zm-4 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
);
const DeviceIcon = IconHOC(device, size, size);

export {DeviceIcon};
