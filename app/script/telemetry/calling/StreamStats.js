/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.telemetry = z.telemetry || {};
window.z.telemetry.calling = z.telemetry.calling || {};

z.telemetry.calling.StreamStats = class StreamStats extends z.telemetry.calling
  .Stats {
  /**
   * Construct a new stream stats report.
   * @param {Date} timestamp - Creation date
   * @returns {StreamStats} The new stream stats entity
   */
    constructor(timestamp) {
    super(timestamp);
    this.local_candidate_type = '';
    this.remote_candidate_type = '';
  }
};
