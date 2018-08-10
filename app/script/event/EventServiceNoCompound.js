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
window.z.event = z.event || {};

// TODO: This function can be removed once Microsoft Edge's IndexedDB supports compound indices:
// - https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/
z.event.EventServiceNoCompound = class EventServiceNoCompound extends z.event.EventService {
  constructor(storage_service) {
    super(storage_service);
  }

  /**
   * Get events with given category.
   *
   * @param {string} conversationId - ID of conversation to add users to
   * @param {z.message.MessageCategory} category - Will be used as lower bound
   * @returns {Promise} Resolves with matching events
   */
  loadEventsWithCategory(conversationId, category) {
    return this.storageService.db[this.EVENT_STORE_NAME]
      .where('conversation')
      .equals(conversationId)
      .sortBy('time')
      .then(records => records.filter(record => record.category >= category));
  }

  /**
   * Load conversation events. Start and end are not included. Events are always sorted beginning with the newest timestamp.
   *
   * @param {string} conversationId - ID of conversation
   * @param {Date} [lowerBound=new Date(0)] - Starting from this timestamp
   * @param {Date} [upperBound=new Date()] - Stop when reaching timestamp
   * @param {number} limit - Amount of events to load
   * @returns {Promise} Resolves with the retrieved records
   */
  loadPrecedingEvents(conversationId, lowerBound = new Date(0), upperBound = new Date(), limit) {
    if (!_.isDate(lowerBound) || !_.isDate(upperBound)) {
      throw new Error(
        `Lower bound (${typeof lowerBound}) and upper bound (${typeof upperBound}) must be of type 'Date'.`
      );
    } else if (lowerBound.getTime() > upperBound.getTime()) {
      throw new Error(
        `Lower bound (${lowerBound.getTime()}) cannot be greater than upper bound (${upperBound.getTime()}).`
      );
    }

    lowerBound = lowerBound.getTime();
    upperBound = upperBound.getTime();

    return this.storageService.db[this.EVENT_STORE_NAME]
      .where('conversation')
      .equals(conversationId)
      .reverse()
      .sortBy('time')
      .then(records => {
        return records.filter(record => {
          const timestamp = new Date(record.time).getTime();
          return timestamp >= lowerBound && timestamp < upperBound;
        });
      })
      .then(records => records.slice(0, limit));
  }
};
