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

import {TIME_IN_MILLIS} from 'Util/TimeUtil';

export const EphemeralTimings = {
  VALUES: [
    TIME_IN_MILLIS.SECOND * 10,
    TIME_IN_MILLIS.MINUTE * 5,
    TIME_IN_MILLIS.HOUR,
    TIME_IN_MILLIS.DAY,
    TIME_IN_MILLIS.WEEK,
    TIME_IN_MILLIS.WEEK * 4,
  ],
};
