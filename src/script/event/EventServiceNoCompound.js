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

  _loadEventsInDateRange(conversationId, fromDate, toDate, limit, includes) {
    const {includeFrom, includeTo} = includes;
    if (!_.isDate(toDate) || !_.isDate(fromDate)) {
      const errorMessage = `Lower bound (${typeof toDate}) and upper bound (${typeof fromDate}) must be of type 'Date'.`;
      throw new Error(errorMessage);
    }

    if (fromDate.getTime() > toDate.getTime()) {
      const errorMessage = `Lower bound (${toDate.getTime()}) cannot be greater than upper bound (${fromDate.getTime()}).`;
      throw new Error(errorMessage);
    }

    return this.storageService.db[this.EVENT_STORE_NAME]
      .where('conversation')
      .equals(conversationId)
      .and(record => {
        const timestamp = new Date(record.time).getTime();
        const fromCompareFunction = includeFrom ? date => timestamp >= date : date => timestamp > date;
        const toCompareFunction = includeTo ? date => timestamp <= date : date => timestamp < date;
        return fromCompareFunction(fromDate) && toCompareFunction(toDate);
      })
      .limit(limit);
  }
};
