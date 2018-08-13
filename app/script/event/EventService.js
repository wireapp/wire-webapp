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

// Conversation service for all conversation calls to the backend REST API.
z.event.EventService = class EventService {
  /**
   * Construct a new Event Service.
   * @param {StorageService} storageService - Service for all storage interactions
   */
  constructor(storageService) {
    this.storageService = storageService;
    this.logger = new z.util.Logger('z.conversation.EventService', z.config.LOGGER.OPTIONS);
    this.EVENT_STORE_NAME = z.storage.StorageSchemata.OBJECT_STORE.EVENTS;
  }

  /**
   * Load event from DB
   *
   * @param {string} conversationId - ID of conversation
   * @param {string} eventId - ID of event to retrieve
   * @returns {Promise} Resolves with the stored record
   */
  loadEvent(conversationId, eventId) {
    if (!conversationId || !eventId) {
      this.logger.error(`Cannot get event '${eventId}' in conversation '${conversationId}' without IDs`);
      const error = new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.MISSING_PARAMETER);
      return Promise.reject(error);
    }

    return this.storageService.db[this.EVENT_STORE_NAME]
      .where('id')
      .equals(eventId)
      .filter(record => record.conversation === conversationId)
      .first()
      .catch(error => {
        const logMessage = `Failed to get event '${eventId}' for conversation '${conversationId}': ${error.message}`;
        this.logger.error(logMessage, error);
        throw error;
      });
  }

  /**
   * Get events with given category.
   *
   * @param {string} conversationId - ID of conversation to add users to
   * @param {MessageCategory} categoryMin - Minimum message category
   * @param {MessageCategory} [categoryMax=z.message.MessageCategory.LIKED] - Maximum message category
   * @returns {Promise} Resolves with matching events
   */
  loadEventsWithCategory(conversationId, categoryMin, categoryMax = z.message.MessageCategory.LIKED) {
    return this.storageService.db[this.EVENT_STORE_NAME]
      .where('[conversation+category]')
      .between([conversationId, categoryMin], [conversationId, categoryMax], true, true)
      .sortBy('time');
  }

  /**
   * Load conversation events starting from the upper bound going back in history
   *  until either limit or lower bound is reached.
   *
   * @param {string} conversationId - ID of conversation
   * @param {Date} [lowerBound=new Date(0)] - Load from this date (included)
   * @param {Date} [upperBound=new Date()] - Load until this date (excluded)
   * @param {number} [limit=Number.MAX_SAFE_INTEGER] - Amount of events to load
   * @returns {Promise} Resolves with the retrieved records
   */
  loadPrecedingEvents(
    conversationId,
    lowerBound = new Date(0),
    upperBound = new Date(),
    limit = Number.MAX_SAFE_INTEGER
  ) {
    if (!_.isDate(lowerBound) || !_.isDate(upperBound)) {
      const errorMessage = `Lower bound (${typeof lowerBound}) and upper bound (${typeof upperBound}) must be of type 'Date'.`;
      throw new Error(errorMessage);
    }

    if (lowerBound.getTime() > upperBound.getTime()) {
      const errorMessage = `Lower bound (${lowerBound.getTime()}) cannot be greater than upper bound (${upperBound.getTime()}).`;
      throw new Error(errorMessage);
    }

    return this.storageService.db[this.EVENT_STORE_NAME]
      .where('[conversation+time]')
      .between([conversationId, lowerBound.toISOString()], [conversationId, upperBound.toISOString()], true, false)
      .reverse()
      .limit(limit)
      .toArray()
      .catch(error => {
        this.logger.error(
          `Failed to load events for conversation '${conversationId}' from database: '${error.message}'`
        );
        throw error;
      });
  }

  /**
   * Save an unencrypted conversation event.
   * @param {Object} event - JSON event to be stored
   * @returns {Promise} Resolves with the stored record
   */
  saveEvent(event) {
    event.category = z.message.MessageCategorization.categoryFromEvent(event);
    return this.storageService.save(this.EVENT_STORE_NAME, undefined, event).then(() => event);
  }

  /**
   * Update an unencrypted conversation event.
   * @param {Object} event - JSON event to be stored
   * @returns {Promise} Resolves with the updated record
   */
  updateEvent(event) {
    return this.storageService.update(this.EVENT_STORE_NAME, event.primary_key, event).then(() => event);
  }

  /**
   * Update a message entity in the database.
   *
   * @param {Message} messageEntity - Message event to update in the database.
   * @param {Object} [updates={}] - Updates to perform on the message.
   * @returns {Promise} Resolves when the message was updated in database.
   */
  updateMessage(messageEntity, updates) {
    return Promise.resolve(messageEntity.primary_key).then(primaryKey => {
      const hasChanges = updates && !!Object.keys(updates).length;
      if (!hasChanges) {
        throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.NO_CHANGES);
      }

      const hasVersionedUpdates = !!updates.version;
      if (hasVersionedUpdates) {
        throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_CHANGE);
      }

      const identifiedUpdates = Object.assign({}, updates, {primary_key: primaryKey});
      return this.updateEvent(identifiedUpdates);
    });
  }
};
