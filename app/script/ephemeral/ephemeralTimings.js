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

'use strict';

window.z = window.z || {};
window.z.ephemeral = z.ephemeral || {};

z.ephemeral.timings = (() => {
  const TIMINGS = [1000 * 5, 1000 * 15, 1000 * 30, 1000 * 60, 1000 * 60 * 5, 1000 * 60 * 60 * 24];

  const _getValues = () => TIMINGS;

  const _mapToClosestTiming = milliseconds => z.util.ArrayUtil.findClosest(TIMINGS, milliseconds);

  return {
    getValues: _getValues,
    mapToClosestTiming: _mapToClosestTiming,
  };
})();
