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

import {getLogger} from 'Util/Logger';

import {StatusType} from '../message/StatusType';
import {MessageCategory} from '../message/MessageCategory';
import {categoryFromEvent} from '../message/MessageCategorization';

import {AssetTransferState} from '../assets/AssetTransferState';
import {StorageSchemata} from '../storage/StorageSchemata';

import {BaseError} from '../error/BaseError';
import {ConversationError} from '../error/ConversationError';
import {StorageError} from '../error/StorageError';

/** Handles all databases interactions related to events */
export class EventService {
  /**
   * Construct a new Event Service.
   * @param {StorageService} storageService Service for all storage interactions
   */
  constructor(storageService) {
    this.storageService = storageService;
    this.logger = getLogger('EventService');
  }

  /**
   * Load events from database.
   *
   * @param {string} conversationId ID of conversation
   * @param {string[]} eventIds ID of events to retrieve
   * @returns {Promise<Object[]>} Resolves with the stored records
   */
  async loadEvents(conversationId, eventIds) {
    if (!conversationId || !eventIds) {
      this.logger.error(`Cannot get events '${eventIds}' in conversation '${conversationId}' without IDs`);
      throw new ConversationError(BaseError.TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER);
    }

    try {
      if (this.storageService.db) {
        const events = await this.storageService.db
          .table(StorageSchemata.OBJECT_STORE.EVENTS)
          .where('id')
          .anyOf(eventIds)
          .filter(record => record.conversation === conversationId)
          .toArray();
        return events;
      }

      const records = await this.storageService.getAll(StorageSchemata.OBJECT_STORE.EVENTS);
      return records
        .filter(record => record.conversation === conversationId && eventIds.includes(record.id))
        .sort((a, b) => a.id - b.id);
    } catch (error) {
      const logMessage = `Failed to get events '${eventIds.join(',')}' for conversation '${conversationId}': ${
        error.message
      }`;
      this.logger.error(logMessage, error);
      throw error;
    }
  }

  /**
   * Load event from database.
   *
   * @param {string} conversationId ID of conversation
   * @param {string} eventId ID of event to retrieve
   * @returns {Promise} Resolves with the stored record
   */
  async loadEvent(conversationId, eventId) {
    if (!conversationId || !eventId) {
      this.logger.error(`Cannot get event '${eventId}' in conversation '${conversationId}' without IDs`);
      throw new ConversationError(BaseError.TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER);
    }

    try {
      if (this.storageService.db) {
        const entry = await this.storageService.db
          .table(StorageSchemata.OBJECT_STORE.EVENTS)
          .where('id')
          .equals(eventId)
          .filter(record => record.conversation === conversationId)
          .first();
        return entry;
      }

      const records = await this.storageService.getAll(StorageSchemata.OBJECT_STORE.EVENTS);
      return records
        .filter(record => record.id === eventId && record.conversation === conversationId)
        .sort((a, b) => a.id - b.id)
        .shift();
    } catch (error) {
      const logMessage = `Failed to get event '${eventId}' for conversation '${conversationId}': ${error.message}`;
      this.logger.error(logMessage, error);
      throw error;
    }
  }

  /**
   * Load all events matching a minimum category from the database.
   *
   * @param {string} conversationId ID of conversation to add users to
   * @param {MessageCategory} categoryMin Minimum message category
   * @param {MessageCategory} [categoryMax=MessageCategory.LIKED] Maximum message category
   * @returns {Promise} Resolves with matching events
   */
  async loadEventsWithCategory(conversationId, categoryMin, categoryMax = MessageCategory.LIKED) {
    if (this.storageService.db) {
      const events = await this.storageService.db
        .table(StorageSchemata.OBJECT_STORE.EVENTS)
        .where('[conversation+category]')
        .between([conversationId, categoryMin], [conversationId, categoryMax], true, true)
        .sortBy('time');
      return events;
    }

    const records = await this.storageService.getAll(StorageSchemata.OBJECT_STORE.EVENTS);
    return records
      .filter(
        record =>
          record.conversation === conversationId && record.category >= categoryMin && record.category <= categoryMax,
      )
      .sort((a, b) => a.time - b.time);
  }

  async loadEventsReplyingToMessage(conversationId, quotedMessageId, quotedMessageTime) {
    if (this.storageService.db) {
      const events = await this.storageService.db
        .table(StorageSchemata.OBJECT_STORE.EVENTS)
        .where(['conversation', 'time'])
        .between([conversationId, quotedMessageTime], [conversationId, new Date().toISOString()], true, true)
        .filter(event => event.data && event.data.quote && event.data.quote.message_id === quotedMessageId)
        .toArray();
      return events;
    }

    const records = await this.storageService.getAll(StorageSchemata.OBJECT_STORE.EVENTS);
    return records
      .filter(record => {
        return (
          record.conversation === conversationId &&
          record.time >= quotedMessageTime &&
          record.time <= new Date().toISOString()
        );
      })
      .filter(event => !!event.data && !!event.data.quote && event.data.quote.message_id === quotedMessageId)
      .sort((a, b) => a.conversation - b.conversation);
  }

  /**
   * Load events starting from the fromDate going back in history until either limit or toDate is reached.
   *
   * @param {string} conversationId ID of conversation
   * @param {Date} [fromDate=new Date(0)] Load from this date (included)
   * @param {Date} [toDate=new Date()] Load until this date (excluded)
   * @param {number} [limit=Number.MAX_SAFE_INTEGER] Amount of events to load
   * @returns {Promise} Resolves with the retrieved records
   */
  async loadPrecedingEvents(
    conversationId,
    fromDate = new Date(0),
    toDate = new Date(),
    limit = Number.MAX_SAFE_INTEGER,
  ) {
    const includeParams = {
      includeFrom: true,
      includeTo: false,
    };

    try {
      const events = await this._loadEventsInDateRange(conversationId, fromDate, toDate, limit, includeParams);
      return this.storageService.db
        ? events.reverse().sortBy('time')
        : events.reverse().sort((a, b) => a.time - b.time);
    } catch (error) {
      const message = `Failed to load events for conversation '${conversationId}' from database: '${error.message}'`;
      this.logger.error(message);
      throw error;
    }
  }

  /**
   * Load events starting from the fromDate to the present until the limit is reached.
   *
   * @param {string} conversationId ID of conversation
   * @param {Date} fromDate Load until this date (excluded)
   * @param {number} [limit=Number.MAX_SAFE_INTEGER] Amount of events to load
   * @param {number} [includeFrom=true] Should upper bound be part of the messages
   * @returns {Promise} Resolves with the retrieved records
   */
  async loadFollowingEvents(conversationId, fromDate, limit = Number.MAX_SAFE_INTEGER, includeFrom = true) {
    const includeParams = {
      includeFrom,
      includeTo: true,
    };
    if (!(fromDate instanceof Date)) {
      const errorMessage = `fromDate ('${typeof fromDate}') must be of type 'Date'.`;
      throw new Error(errorMessage);
    }
    const toDate = new Date(Math.max(fromDate.getTime() + 1, Date.now()));

    const events = await this._loadEventsInDateRange(conversationId, fromDate, toDate, limit, includeParams);
    return this.storageService.db ? events.sortBy('time') : events.sort((a, b) => a.time - b.time);
  }

  /**
   *
   * @param {string} conversationId The conversation ID
   * @param {Date} fromDate The lower date bound
   * @param {Date} toDate The upper date bound
   * @param {number} limit The events limit
   * @param {{includeFrom: boolean, includeTo: boolean}} includes If from and to should be included
   * @returns {Promise<Object[]>} The found events
   */
  async _loadEventsInDateRange(conversationId, fromDate, toDate, limit, includes) {
    const {includeFrom, includeTo} = includes;
    if (!(toDate instanceof Date) || !(fromDate instanceof Date)) {
      const errorMessage = `Lower bound (${typeof toDate}) and upper bound (${typeof fromDate}) must be of type 'Date'.`;
      throw new Error(errorMessage);
    }

    if (fromDate.getTime() > toDate.getTime()) {
      const errorMessage = `Lower bound (${fromDate.getTime()}) cannot be greater than upper bound (${toDate.getTime()}).`;
      throw new Error(errorMessage);
    }

    if (this.storageService.db) {
      const events = await this.storageService.db
        .table(StorageSchemata.OBJECT_STORE.EVENTS)
        .where('[conversation+time]')
        .between(
          [conversationId, fromDate.toISOString()],
          [conversationId, toDate.toISOString()],
          includeFrom,
          includeTo,
        )
        .limit(limit);
      return events;
    }

    const records = await this.storageService.getAll(StorageSchemata.OBJECT_STORE.EVENTS);
    return records
      .filter(
        record =>
          record.conversation === conversationId &&
          (includeFrom ? record.time >= fromDate.toISOString() : record.time > fromDate.toISOString()) &&
          (includeTo ? record.time <= toDate.toISOString() : record.time < toDate.toISOString()),
      )
      .sort((a, b) => a.conversation - b.conversation)
      .slice(0, limit);
  }

  /**
   * Save an unencrypted conversation event.
   * Will also recompute the category of the event to be stored.
   *
   * @param {Object} event JSON event to be stored
   * @returns {Promise<Event>} Resolves with the stored record
   */
  async saveEvent(event) {
    event.category = categoryFromEvent(event);
    event.primary_key = await this.storageService.save(StorageSchemata.OBJECT_STORE.EVENTS, undefined, event);
    if (this.storageService.isTemporaryAndNonPersistent) {
      /**
       * Dexie supports auto-incrementing primary keys and saves those keys to a predefined column.
       * The SQLeetEngine also supports auto-incrementing primary keys but it does not save them to a predefined column, so we have to do that manually:
       */
      await this.storageService.update(StorageSchemata.OBJECT_STORE.EVENTS, event.primary_key, {
        primary_key: event.primary_key,
      });
    }
    return event;
  }

  /**
   * Update an unencrypted event.
   *
   * @param {Object} event JSON event to be stored
   * @returns {Promise<Event>} Resolves with the updated record
   */
  replaceEvent(event) {
    return this.storageService.update(StorageSchemata.OBJECT_STORE.EVENTS, event.primary_key, event).then(() => event);
  }

  addEventUpdatedListener(callback) {
    this.storageService.addUpdatedListener(StorageSchemata.OBJECT_STORE.EVENTS, callback);
  }

  addEventDeletedListener(callback) {
    this.storageService.addDeletedListener(StorageSchemata.OBJECT_STORE.EVENTS, callback);
  }

  /**
   * Update event as uploaded in database.
   *
   * @param {string} primaryKey Primary key used to find an event in the database
   * @param {Object} event Updated event asset data
   * @returns {Promise} Resolves when the message was updated in database
   */
  updateEventAsUploadSucceeded(primaryKey, event) {
    return this.storageService.load(StorageSchemata.OBJECT_STORE.EVENTS, primaryKey).then(record => {
      if (!record) {
        return this.logger.warn('Did not find message to update asset (uploaded)', primaryKey);
      }
      const assetData = event.data;

      record.data.id = assetData.id;
      record.data.key = assetData.key;
      record.data.otr_key = assetData.otr_key;
      record.data.sha256 = assetData.sha256;
      record.data.status = AssetTransferState.UPLOADED;
      record.data.token = assetData.token;
      record.status = StatusType.SENT;

      return this.replaceEvent(record).then(() => this.logger.info('Updated asset message_et (uploaded)', primaryKey));
    });
  }

  /**
   * Update event as upload failed in database.
   *
   * @param {string} primaryKey Primary key used to find an event in the database
   * @param {string} reason Failure reason
   * @returns {Promise} Resolves when the message was updated in database
   */
  updateEventAsUploadFailed(primaryKey, reason) {
    return this.storageService.load(StorageSchemata.OBJECT_STORE.EVENTS, primaryKey).then(record => {
      if (!record) {
        return this.logger.warn('Did not find message to update asset (failed)', primaryKey);
      }
      record.data.reason = reason;
      record.data.status = AssetTransferState.UPLOAD_FAILED;

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
   * @param {string} primaryKey event's primary key
   * @param {Object<Event>} [updates={}] Updates to perform on the message.
   * @returns {Promise} Resolves when the message was updated in database.
   */
  updateEvent(primaryKey, updates) {
    return Promise.resolve(primaryKey).then(key => {
      const hasChanges = updates && !!Object.keys(updates).length;
      if (!hasChanges) {
        throw new ConversationError(ConversationError.TYPE.NO_CHANGES, ConversationError.MESSAGE.NO_CHANGES);
      }

      const hasVersionedUpdates = !!updates.version;
      if (hasVersionedUpdates) {
        const error = new ConversationError(
          ConversationError.TYPE.WRONG_CHANGE,
          ConversationError.MESSAGE.WRONG_CHANGE,
        );
        error.message += ' Use the `updateEventSequentially` method to perform a versioned update of an event';
        throw error;
      }

      const identifiedUpdates = {...updates, primary_key: key};
      return this.replaceEvent(identifiedUpdates);
    });
  }

  /**
   * Update an event in the database and checks that the update is sequential.
   *
   * @param {number} primaryKey Event primary key
   * @param {Object} [changes={}] Changes to update message with
   * @returns {Promise<Event>} Resolves when the message was updated in database
   */
  async updateEventSequentially(primaryKey, changes = {}) {
    return Promise.resolve().then(() => {
      const hasVersionedChanges = !!changes.version;
      if (!hasVersionedChanges) {
        throw new ConversationError(ConversationError.TYPE.WRONG_CHANGE, ConversationError.MESSAGE.WRONG_CHANGE);
      }

      if (this.storageService.db) {
        // Create a DB transaction to avoid concurrent sequential update.
        return this.storageService.db.transaction('rw', StorageSchemata.OBJECT_STORE.EVENTS, () => {
          return this.storageService.load(StorageSchemata.OBJECT_STORE.EVENTS, primaryKey).then(record => {
            if (!record) {
              throw new StorageError(StorageError.TYPE.NOT_FOUND, StorageError.MESSAGE.NOT_FOUND);
            }

            const databaseVersion = record.version || 1;

            const isSequentialUpdate = changes.version === databaseVersion + 1;
            if (isSequentialUpdate) {
              return this.storageService.update(StorageSchemata.OBJECT_STORE.EVENTS, primaryKey, changes);
            }

            const logMessage = 'Failed sequential database update';
            const logObject = {
              databaseVersion: databaseVersion,
              updateVersion: changes.version,
            };

            this.logger.error(logMessage, logObject);

            window.Raygun.send(new Error(logMessage), logObject);
            throw new StorageError(StorageError.TYPE.NON_SEQUENTIAL_UPDATE, StorageError.MESSAGE.NON_SEQUENTIAL_UPDATE);
          });
        });
      }
      return this.storageService.update(StorageSchemata.OBJECT_STORE.EVENTS, primaryKey, changes);
    });
  }

  /**
   * Delete an event from a conversation. Duplicates are delete as well.
   *
   * @param {string} conversationId ID of conversation to remove message from
   * @param {string} eventId ID of the actual message
   * @returns {Promise} Resolves with the number of deleted records
   */
  async deleteEvent(conversationId, eventId) {
    return this.storageService.deleteEventInConversation(StorageSchemata.OBJECT_STORE.EVENTS, conversationId, eventId);
  }

  /**
   * Delete an event from a conversation with the given primary.
   *
   * @param {string} primaryKey ID of the actual message
   * @returns {Promise} Resolves with the number of deleted records
   */
  deleteEventByKey(primaryKey) {
    return this.storageService.delete(StorageSchemata.OBJECT_STORE.EVENTS, primaryKey);
  }

  /**
   * Delete all events of a conversation.
   *
   * @param {string} conversationId Delete events for this conversation
   * @param {string} [isoDate] Date in ISO string format as upper bound which events should be removed
   * @returns {Promise} Resolves when the events was deleted
   */
  async deleteEvents(conversationId, isoDate) {
    return this.storageService.deleteEventsByDate(StorageSchemata.OBJECT_STORE.EVENTS, conversationId, isoDate);
  }
}
