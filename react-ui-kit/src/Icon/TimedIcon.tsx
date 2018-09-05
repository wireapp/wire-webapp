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

import * as React from 'react';
import IconHOC from './IconHOC';

const width = 12;
const height = 16;
const timed = (
  <path d="M5 8a1 1 0 0 0 2 0H5zm2 0c0 1 .4 1.6 1.1 2.3l.7.6c.7.6 1 1.5 1.2 3.1H2c.1-1.6.5-2.5 1.2-3.1l.7-.6C4.6 9.6 5 9 5 8h2zm3-6l-.2 1H2.2L2 2h8zm1 0h1V1c0-.6-.4-1-1-1H1a1 1 0 0 0-1 1v1h1c.4 4.7 3 3.8 3 6s-2.6 1.3-3 6H0v1c0 .6.4 1 1 1h10c.5 0 1-.4 1-1v-1h-1c-.4-4.7-3-3.8-3-6s2.6-1.3 3-6z" />
);
const TimedIcon = IconHOC(timed, width, height);

export {TimedIcon};
