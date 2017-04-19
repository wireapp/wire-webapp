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

z.telemetry.calling.Stats = class Stats {
  /**
   * Construct a new stats report.
   *
   * @link http://w3c.github.io/webrtc-stats/
   * @param {Date} timestamp - Creation date
   * @returns {StreamStats} The new stats entity
   */
  constructor(timestamp) {
    this.timestamp = timestamp;
    this.bytes_received = 0;
    this.bytes_sent = 0;
    this.packets_lost = 0;
    this.round_trip_time = 0;
  }
};
