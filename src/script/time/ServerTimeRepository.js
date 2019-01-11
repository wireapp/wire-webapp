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

import ko from 'knockout';

window.z = window.z || {};
window.z.time = z.time || {};

z.time.ServerTimeRepository = class ServerTimeRepository {
  constructor() {
    this.logger = new z.util.Logger('z.time.ServerTimeRepository', z.config.LOGGER.OPTIONS);
    this.timeOffset = ko.observable(undefined);
  }

  computeTimeOffset(serverTimeString) {
    const timeOffset = new Date() - new Date(serverTimeString);
    this.timeOffset(timeOffset);
    this.logger.info(`Current backend time is '${serverTimeString}'. Time offset updated to '${this.timeOffset()}' ms`);
  }

  getTimeOffset() {
    if (this.timeOffset() === undefined) {
      this.logger.warn('Trying to get server/client time offset, but no server time has been set.');
      return 0;
    }
    return this.timeOffset();
  }

  /**
   * Converts a local timestamp to a server timestamp.
   * @param {number} [localTimestamp = Date.now()] - the local timestamp to convert
   * @returns {number} serverTimestamp - the timestamp adjusted with the client/server time shift
   */
  toServerTimestamp(localTimestamp = Date.now()) {
    return localTimestamp - this.getTimeOffset();
  }

  /**
   * Converts a server timestamp to a local timestamp.
   * @param {number} [serverTimestamp = Date.now()] - the server timestamp to convert
   * @returns {number} localTimestamp - the timestamp adjusted with the client/server time shift
   */
  toLocalTimestamp(serverTimestamp = Date.now()) {
    return serverTimestamp + this.getTimeOffset();
  }
};
