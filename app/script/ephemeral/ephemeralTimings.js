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

window.z = window.z || {};
window.z.ephemeral = z.ephemeral || {};

z.ephemeral.timings = class {
  static get VALUES() {
    return [
      z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 10,
      z.util.TimeUtil.UNITS_IN_MILLIS.MINUTE * 5,
      z.util.TimeUtil.UNITS_IN_MILLIS.HOUR,
      z.util.TimeUtil.UNITS_IN_MILLIS.DAY,
      z.util.TimeUtil.UNITS_IN_MILLIS.WEEK,
      z.util.TimeUtil.UNITS_IN_MILLIS.WEEK * 4,
    ];
  }
};
