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

/** Handles all databases interactions related to events */
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
   * Load event from database.
   *
   * @param {string} conversationId - ID of conversation
   * @param {string} eventId - ID of event to retrieve
   * @returns {Promise} Resolves with the stored record
   */
  loadEvent(conversationId, eventId) {
    if (!conversationId || !eventId) {
      this.logger.error(`Cannot get event '${eventId}' in conversation '${conversationId}' without IDs`);
      return Promise.reject(new z.error.ConversationError(z.error.BaseError.TYPE.MISSING_PARAMETER));
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
   * Load all events that match a minimun category from database.
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

  loadEventsReplyingToMessage(conversationId, quotedMessageId, quotedMessageTime) {
    return this.storageService.db[this.EVENT_STORE_NAME]
      .where(['conversation', 'time'])
      .between([conversationId, quotedMessageTime], [conversationId, new Date().toISOString()], true, true)
      .filter(event => event.data && event.data.quote && event.data.quote.message_id === quotedMessageId)
      .toArray();
  }

  /**
   * Load events starting from the fromDate going back in history until either limit or toDate is reached.
   *
   * @param {string} conversationId - ID of conversation
   * @param {Date} [fromDate=new Date(0)] - Load from this date (included)
   * @param {Date} [toDate=new Date()] - Load until this date (excluded)
   * @param {number} [limit=Number.MAX_SAFE_INTEGER] - Amount of events to load
   * @returns {Promise} Resolves with the retrieved records
   */
  loadPrecedingEvents(conversationId, fromDate = new Date(0), toDate = new Date(), limit = Number.MAX_SAFE_INTEGER) {
    const includeParams = {
      includeFrom: true,
      includeTo: false,
    };

    return this._loadEventsInDateRange(conversationId, fromDate, toDate, limit, includeParams)
      .reverse()
      .sortBy('time')
      .catch(error => {
        const message = `Failed to load events for conversation '${conversationId}' from database: '${error.message}'`;
        this.logger.error(message);
        throw error;
      });
  }

  /**
   * Load events starting from the fromDate to the present until the limit is reached.
   *
   * @param {string} conversationId - ID of conversation
   * @param {Date} fromDate - Load until this date (excluded)
   * @param {number} [limit=Number.MAX_SAFE_INTEGER] - Amount of events to load
   * @param {number} [includeFrom=true] - Should upper bound be part of the messages
   * @returns {Promise} Resolves with the retrieved records
   */
  loadFollowingEvents(conversationId, fromDate, limit = Number.MAX_SAFE_INTEGER, includeFrom = true) {
    const includeParams = {
      includeFrom,
      includeTo: true,
    };
    if (!_.isDate(fromDate)) {
      const errorMessage = `fromDate ('${typeof fromDate}') must be of type 'Date'.`;
      throw new Error(errorMessage);
    }
    const toDate = new Date(Math.max(fromDate.getTime() + 1, Date.now()));

    return this._loadEventsInDateRange(conversationId, fromDate, toDate, limit, includeParams).sortBy('time');
  }

  _loadEventsInDateRange(conversationId, fromDate, toDate, limit, includes) {
    const {includeFrom, includeTo} = includes;
    if (!_.isDate(toDate) || !_.isDate(fromDate)) {
      const errorMessage = `Lower bound (${typeof toDate}) and upper bound (${typeof fromDate}) must be of type 'Date'.`;
      throw new Error(errorMessage);
    }

    if (fromDate.getTime() > toDate.getTime()) {
      const errorMessage = `Lower bound (${fromDate.getTime()}) cannot be greater than upper bound (${toDate.getTime()}).`;
      throw new Error(errorMessage);
    }

    return this.storageService.db[this.EVENT_STORE_NAME]
      .where('[conversation+time]')
      .between([conversationId, fromDate.toISOString()], [conversationId, toDate.toISOString()], includeFrom, includeTo)
      .limit(limit);
  }

  /**
   * Save an unencrypted conversation event.
   * Will also recompute the category of the event to be stored.
   *
   * @param {Object} event - JSON event to be stored
   * @returns {Promise<Event>} Resolves with the stored record
   */
  saveEvent(event) {
    event.category = z.message.MessageCategorization.categoryFromEvent(event);
    return this.storageService.save(this.EVENT_STORE_NAME, undefined, event).then(() => event);
  }

  /**
   * Update an unencrypted event.
   *
   * @param {Object} event - JSON event to be stored
   * @returns {Promise<Event>} Resolves with the updated record
   */
  replaceEvent(event) {
    return this.storageService.update(this.EVENT_STORE_NAME, event.primary_key, event).then(() => event);
  }

  /**
   * Update event as uploaded in database.
   *
   * @param {string} primaryKey - Primary key used to find an event in the database
   * @param {Object} event - Updated event asset data
   * @returns {Promise} Resolves when the message was updated in database
   */
  updateEventAsUploadSucceeded(primaryKey, event) {
    return this.storageService.load(this.EVENT_STORE_NAME, primaryKey).then(record => {
      if (!record) {
        return this.logger.warn('Did not find message to update asset (uploaded)', primaryKey);
      }
      const assetData = event.data;

      record.data.id = assetData.id;
      record.data.key = assetData.key;
      record.data.otr_key = assetData.otr_key;
      record.data.sha256 = assetData.sha256;
      record.data.status = z.assets.AssetTransferState.UPLOADED;
      record.data.token = assetData.token;
      record.status = z.message.StatusType.SENT;

      return this.replaceEvent(record).then(() => this.logger.info('Updated asset message_et (uploaded)', primaryKey));
    });
  }

  /**
   * Update event as upload failed in database.
   *
   * @param {string} primaryKey - Primary key used to find an event in the database
   * @param {string} reason - Failure reason
   * @returns {Promise} Resolves when the message was updated in database
   */
  updateEventAsUploadFailed(primaryKey, reason) {
    return this.storageService.load(this.EVENT_STORE_NAME, primaryKey).then(record => {
      if (!record) {
        return this.logger.warn('Did not find message to update asset (failed)', primaryKey);
      }
      record.data.reason = reason;
      record.data.status = z.assets.AssetTransferState.UPLOAD_FAILED;

      return this.replaceEvent(record).then(() => {
        this.logger.info('Updated asset message_et (failed)', primaryKey);
        return record;
      });
    });
  }

  /**
   * Update an unencrypted event.
   * A valid update must not contain a 'version' property.
   *
   * @param {number} primaryKey - event's primary key
   * @param {Object<Event>} [updates={}] - Updates to perform on the message.
   * @returns {Promise} Resolves when the message was updated in database.
   */
  updateEvent(primaryKey, updates) {
    return Promise.resolve(primaryKey).then(key => {
      const hasChanges = updates && !!Object.keys(updates).length;
      if (!hasChanges) {
        throw new z.error.ConversationError(z.error.ConversationError.TYPE.NO_CHANGES);
      }

      const hasVersionedUpdates = !!updates.version;
      if (hasVersionedUpdates) {
        const error = new z.error.ConversationError(z.error.ConversationError.TYPE.WRONG_CHANGE);
        error.message += ' Use the `updateEventSequentially` method to perform a versioned update of an event';
        throw error;
      }

      const identifiedUpdates = Object.assign({}, updates, {primary_key: key});
      return this.replaceEvent(identifiedUpdates);
    });
  }

  /**
   * Update an event in the database and checks that the update is sequential.
   *
   * @param {number} primaryKey - Event primary key
   * @param {Object} [changes={}] - Changes to update message with
   * @returns {Promise<Event>} Resolves when the message was updated in database
   */
  updateEventSequentially(primaryKey, changes = {}) {
    return Promise.resolve(primaryKey).then(key => {
      const hasVersionedChanges = !!changes.version;
      if (!hasVersionedChanges) {
        throw new z.error.ConversationError(z.error.ConversationError.TYPE.WRONG_CHANGE);
      }

      // Create a DB transaction to avoid concurrent sequential update.
      return this.storageService.db.transaction('rw', this.EVENT_STORE_NAME, () => {
        return this.storageService.load(this.EVENT_STORE_NAME, key).then(record => {
          if (!record) {
            throw new z.error.StorageError(z.error.StorageError.TYPE.NOT_FOUND);
          }

          const databaseVersion = record.version || 1;

          const isSequentialUpdate = changes.version === databaseVersion + 1;
          if (isSequentialUpdate) {
            return this.storageService.update(this.EVENT_STORE_NAME, primaryKey, changes);
          }

          const logMessage = 'Failed sequential database update';
          const logObject = {
            databaseVersion: databaseVersion,
            updateVersion: changes.version,
          };

          this.logger.error(logMessage, logObject);

          Raygun.send(new Error(logMessage), logObject);
          throw new z.error.StorageError(z.error.StorageError.TYPE.NON_SEQUENTIAL_UPDATE);
        });
      });
    });
  }

  /**
   * Delete an event from a conversation. Duplicates are delete as well.
   *
   * @param {string} conversationId - ID of conversation to remove message from
   * @param {string} eventId - ID of the actual message
   * @returns {Promise} Resolves with the number of deleted records
   */
  deleteEvent(conversationId, eventId) {
    return this.storageService.db[this.EVENT_STORE_NAME]
      .where('id')
      .equals(eventId)
      .and(record => record.conversation === conversationId)
      .delete();
  }

  /**
   * Delete an event from a conversation with the given primary.
   *
   * @param {string} primaryKey - ID of the actual message
   * @returns {Promise} Resolves with the number of deleted records
   */
  deleteEventByKey(primaryKey) {
    return this.storageService.db[this.EVENT_STORE_NAME].delete(primaryKey);
  }

  /**
   * Delete all events of a conversation.
   *
   * @param {string} conversationId - Delete events for this conversation
   * @param {string} [isoDate] - Date in ISO string format as upper bound which events should be removed
   * @returns {Promise} Resolves when the events was deleted
   */
  deleteEvents(conversationId, isoDate) {
    return this.storageService.db[this.EVENT_STORE_NAME]
      .where('conversation')
      .equals(conversationId)
      .filter(record => !isoDate || isoDate >= record.time)
      .delete();
  }
};
