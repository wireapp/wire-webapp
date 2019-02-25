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

/** @jsx jsx */
import {jsx} from '@emotion/core';
import IconHOC from './IconHOC';

const size = 16;
const leave = <path d="M2 14h7v2H0V0h9v2H2v12zm3-7v2h7v4l4-5-4-5v4H5z" />;
const LeaveIcon = IconHOC(leave, size, size);

export {LeaveIcon};
