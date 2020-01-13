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

/* eslint-disable sort-keys-fix/sort-keys-fix */
import ko from 'knockout';

import {Logger, getLogger} from 'Util/Logger';

export interface ServerTimeHandler {
  logger: Logger;
  timeOffset: ko.Observable<number>;
  computeTimeOffset: (serverTimeString: string) => void;
  getTimeOffset: () => number;
  toServerTimestamp: (localTimestamp?: number) => number;
  toLocalTimestamp: (serverTimestamp?: number) => number;
}

export const serverTimeHandler: ServerTimeHandler = {
  logger: getLogger('serverTimeHandler'),
  timeOffset: ko.observable(undefined),

  computeTimeOffset(serverTimeString): void {
    const timeOffset = Date.now() - new Date(serverTimeString).valueOf();
    this.timeOffset(timeOffset);
    this.logger.info(`Current backend time is '${serverTimeString}'. Time offset updated to '${this.timeOffset()}' ms`);
  },

  getTimeOffset(): number {
    if (this.timeOffset() === undefined) {
      this.logger.warn('Trying to get server/client time offset, but no server time has been set.');
      return 0;
    }
    return this.timeOffset();
  },

  /**
   * Converts a local timestamp to a server timestamp.
   * @param localTimestamp the local timestamp to convert
   * @returns serverTimestamp - the timestamp adjusted with the client/server time shift
   */
  toServerTimestamp(localTimestamp = Date.now()): number {
    return localTimestamp - this.getTimeOffset();
  },

  /**
   * Converts a server timestamp to a local timestamp.
   * @param serverTimestamp the server timestamp to convert
   * @returns localTimestamp - the timestamp adjusted with the client/server time shift
   */
  toLocalTimestamp(serverTimestamp = Date.now()): number {
    return serverTimestamp + this.getTimeOffset();
  },
};
