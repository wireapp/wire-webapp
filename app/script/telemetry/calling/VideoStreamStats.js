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

z.telemetry.calling.VideoStreamStats = class VideoStreamStats extends z.telemetry.calling.MediaStreamStats {
  /**
   * Construct a new VideoStream stats report.
   * @param {Date} timestamp - Creation date
   * @returns {VideoStreamStats} The new VideoStream stats entity
   */
  constructor(timestamp) {
    super(timestamp);
    this.media_type = z.media.MediaType.VIDEO;
    this.frame_height_received = 0;
    this.frame_height_sent = 0;
    this.frame_rate_received = 0;
    this.frame_rate_sent = 0;
    this.frame_width_received = 0;
    this.frame_width_sent = 0;
  }
};
