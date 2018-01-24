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
window.z.conversation = z.conversation || {};

// TODO: This function can be removed once Microsoft Edge's IndexedDB supports compound indices:
// - https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/
z.conversation.ConversationServiceNoCompound = class ConversationServiceNoCompound extends z.conversation
  .ConversationService {
  constructor(client, storage_service) {
    super(client, storage_service);
  }

  /**
   * Get events with given category.
   *
   * @param {string} conversation_id - ID of conversation to add users to
   * @param {z.message.MessageCategory} category - Will be used as lower bound
   * @returns {Promise} Resolves with matching events
   */
  load_events_with_category_from_db(conversation_id, category) {
    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('conversation')
      .equals(conversation_id)
      .sortBy('time')
      .then(records => records.filter(record => record.category >= category));
  }

  /**
   * Load conversation events. Start and end are not included. Events are always sorted beginning with the newest timestamp.
   *
   * @param {string} conversation_id - ID of conversation
   * @param {Date} [lower_bound=new Date(0)] - Starting from this timestamp
   * @param {Date} [upper_bound=new Date()] - Stop when reaching timestamp
   * @param {number} limit - Amount of events to load
   * @returns {Promise} Resolves with the retrieved records
   */
  load_preceding_events_from_db(conversation_id, lower_bound = new Date(0), upper_bound = new Date(), limit) {
    if (!_.isDate(lower_bound) || !_.isDate(upper_bound)) {
      throw new Error(
        `Lower bound (${typeof lower_bound}) and upper bound (${typeof upper_bound}) must be of type 'Date'.`
      );
    } else if (lower_bound.getTime() > upper_bound.getTime()) {
      throw new Error(
        `Lower bound (${lower_bound.getTime()}) cannot be greater than upper bound (${upper_bound.getTime()}).`
      );
    }

    lower_bound = lower_bound.getTime();
    upper_bound = upper_bound.getTime();

    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('conversation')
      .equals(conversation_id)
      .reverse()
      .sortBy('time')
      .then(records => {
        return records.filter(record => {
          const timestamp = new Date(record.time).getTime();
          return timestamp >= lower_bound && timestamp < upper_bound;
        });
      })
      .then(records => records.slice(0, limit));
  }
};
