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
window.z.server = z.server || {};

z.server.ServerTimeOffsetRepository = class ServerTimeOffsetRepository {
  constructor() {
    this.logger = new z.util.Logger('z.server.ServerTimeOffsetRepository', z.config.LOGGER.OPTIONS);
    this._timeOffset = undefined;
  }

  computeTimeOffset(serverTimeString) {
    this._timeOffset = new Date() - new Date(serverTimeString);
    this.logger.info(`Current backend time is '${serverTimeString}'. Time offset updated to '${this._timeOffset}' ms`);
  }

  getTimeOffset() {
    return this._timeOffset;
  }

  adjustTimestamp(timestamp = 0) {
    if (this._timeOffset === undefined) {
      this.logger.warn('Trying to adjust timestamp, but no server timestamp set');
      return timestamp;
    }
    return timestamp - this._timeOffset;
  }
};
