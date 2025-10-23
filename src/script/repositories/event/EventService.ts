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

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import type {Dexie} from 'dexie';
import {container} from 'tsyringe';

import {Asset as ProtobufAsset} from '@wireapp/protocol-messaging';

import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {StorageService, DatabaseListenerCallback, LegacyEventRecord, EventRecord} from 'Repositories/storage';
import {StorageSchemata} from 'Repositories/storage/StorageSchemata';
import {getLogger, Logger} from 'Util/Logger';

import {ClientEvent, CONVERSATION as CLIENT_CONVERSATION_EVENT} from './Client';

import {BaseError, BASE_ERROR_TYPE} from '../../error/BaseError';
import {ConversationError} from '../../error/ConversationError';
import {StorageError} from '../../error/StorageError';
import {categoryFromEvent} from '../../message/MessageCategorization';
import {MessageCategory} from '../../message/MessageCategory';

type Includes = {includeFrom: boolean; includeTo: boolean};
type DexieCollection = Dexie.Collection<any, any>;
type DBEvents = DexieCollection | EventRecord[];
export type IdentifiedUpdatePayload = Partial<EventRecord> & Pick<EventRecord, 'primary_key'>;

const eventTimeToDate = (time: string) => new Date(time) || new Date(parseInt(time, 10));

const compareEventsByConversation = (eventA: EventRecord, eventB: EventRecord) =>
  eventA.conversation.localeCompare(eventB.conversation);

const compareEventsById = (eventA: EventRecord, eventB: EventRecord) => eventA.id.localeCompare(eventB.id);
const compareEventsByTime = (eventA: EventRecord, eventB: EventRecord) =>
  eventTimeToDate(eventA.time).getTime() - eventTimeToDate(eventB.time).getTime();

/** Handles all databases interactions related to events */
export class EventService {
  logger: Logger;

  constructor(public readonly storageService = container.resolve(StorageService)) {
    this.logger = getLogger('EventService');
  }

  async loadEvents(conversationId: string, eventIds: string[]): Promise<EventRecord[]> {
    if (!conversationId || !eventIds) {
      this.logger.error(`Cannot get events '${eventIds}' in conversation '${conversationId}' without IDs`);
      throw new ConversationError(BASE_ERROR_TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER);
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

      const records = await this.storageService.getAll<EventRecord>(StorageSchemata.OBJECT_STORE.EVENTS);
      return records
        .filter(record => record.conversation === conversationId && eventIds.includes(record.id))
        .sort(compareEventsById);
    } catch (error) {
      const logMessage = `Failed to get events '${eventIds.join(',')}' for conversation '${conversationId}': ${
        error.message
      }`;
      this.logger.error(logMessage, error);
      throw error;
    }
  }

  async loadEphemeralEvents(conversationId: string): Promise<EventRecord[]> {
    if (!conversationId) {
      this.logger.error(`Cannot get ephemeral events in conversation '${conversationId}' without ID`);
      throw new ConversationError(BASE_ERROR_TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER);
    }

    try {
      if (this.storageService.db) {
        const events = await this.storageService.db
          .table(StorageSchemata.OBJECT_STORE.EVENTS)
          .where('conversation')
          .equals(conversationId)
          .and(record => !!record.ephemeral_expires)
          .toArray();
        return events;
      }

      const records = await this.storageService.getAll<EventRecord>(StorageSchemata.OBJECT_STORE.EVENTS);
      return records
        .filter(record => record.conversation === conversationId && !!record.ephemeral_expires)
        .sort(compareEventsById);
    } catch (error) {
      const logMessage = `Failed to get ephemeral events for conversation '${conversationId}': ${error.message}`;
      this.logger.error(logMessage, error);
      throw error;
    }
  }

  /**
   * Load event from database.
   *
   * @param conversationId ID of conversation
   * @param eventId ID of event to retrieve
   */
  async loadEvent(conversationId: string, eventId: string): Promise<EventRecord | undefined> {
    if (!conversationId || !eventId) {
      this.logger.error(`Cannot get event '${eventId}' in conversation '${conversationId}' without IDs`);
      throw new ConversationError(BASE_ERROR_TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER);
    }

    try {
      if (this.storageService.db) {
        const eventStore = this.storageService.db.table(StorageSchemata.OBJECT_STORE.EVENTS);
        // First lookup the event by its direct id (using the index)
        const event = eventStore.where('id').equals(eventId).first();
        return (
          event ||
          // If the event was not found, fallback to filtering all the events and check if a `replacing` message is found
          eventStore
            .where('conversation')
            .equals(conversationId)
            .filter(item => item.data?.replacing_message_id === eventId || item.id === eventId)
            .first()
        );
      }

      const records = await this.storageService.getAll<EventRecord>(StorageSchemata.OBJECT_STORE.EVENTS);
      return records
        .filter(record => record.id === eventId && record.conversation === conversationId)
        .sort(compareEventsById)
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
   * @param conversationId ID of conversation to add users to
   * @param categoryMin Minimum message category
   * @param categoryMax Maximum message category
   */
  async loadEventsWithCategory(
    conversationId: string,
    categoryMin: MessageCategory,
    categoryMax = MessageCategory.LIKED,
  ): Promise<DBEvents> {
    const filterExpired = (record: EventRecord) => {
      if (typeof record.ephemeral_expires !== 'undefined') {
        return +record.ephemeral_expires - Date.now() > 0;
      }

      return true;
    };

    if (this.storageService.db) {
      const events = await this.storageService.db
        .table(StorageSchemata.OBJECT_STORE.EVENTS)
        .where('[conversation+category]')
        .between([conversationId, categoryMin], [conversationId, categoryMax], true, true)
        .and(filterExpired)
        .sortBy('time');
      return events;
    }

    const records = await this.storageService.getAll<EventRecord>(StorageSchemata.OBJECT_STORE.EVENTS);
    return records
      .filter(
        record =>
          record.conversation === conversationId && record.category >= categoryMin && record.category <= categoryMax,
      )
      .filter(filterExpired)
      .sort(compareEventsByTime);
  }

  async loadEventsReplyingToMessage(conversationId: string, quotedMessageId: string, quotedMessageTime: string) {
    if (this.storageService.db) {
      const events = await this.storageService.db
        .table(StorageSchemata.OBJECT_STORE.EVENTS)
        .where(['conversation', 'time'])
        .between([conversationId, quotedMessageTime], [conversationId, new Date().toISOString()], true, true)
        .filter(event => event.data && event.data.quote && event.data.quote.message_id === quotedMessageId)
        .toArray();
      return events;
    }

    const records = await this.storageService.getAll<any>(StorageSchemata.OBJECT_STORE.EVENTS);
    return records
      .filter(record => {
        return (
          record.conversation === conversationId &&
          record.time >= quotedMessageTime &&
          record.time <= new Date().toISOString()
        );
      })
      .filter(event => !!event.data && !!event.data.quote && event.data.quote.message_id === quotedMessageId)
      .sort(compareEventsByConversation);
  }

  /**
   * Load events starting from the fromDate going back in history until either limit or toDate is reached.
   *
   * @param conversationId ID of conversation
   * @param fromDate Load from this date (included)
   * @param toDate Load until this date (excluded)
   * @param limit Amount of events to load
   */
  async loadPrecedingEvents(
    conversationId: string,
    fromDate = new Date(0),
    toDate = new Date(),
    limit = Number.MAX_SAFE_INTEGER,
  ): Promise<DBEvents> {
    const includeParams = {
      includeFrom: true,
      includeTo: false,
    };

    try {
      const events = await this._loadEventsInDateRange(conversationId, fromDate, toDate, limit, includeParams);
      return this.storageService.db
        ? await (events as Dexie.Collection<any, any>).reverse().sortBy('time')
        : (events as EventRecord[]).reverse().sort(compareEventsByTime);
    } catch (error) {
      const message = `Failed to load events for conversation '${conversationId}' from database: '${error.message}'`;
      this.logger.error(message);
      throw error;
    }
  }

  /**
   * Load events starting from the fromDate to the present until the limit is reached.
   *
   * @param conversationId ID of conversation
   * @param fromDate Load until this date (excluded)
   * @param limit Amount of events to load
   * @param includeFrom Should upper bound be part of the messages
   */
  async loadFollowingEvents(
    conversationId: string,
    fromDate: Date,
    limit = Number.MAX_SAFE_INTEGER,
    includeFrom = true,
  ): Promise<DBEvents> {
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
    return this.storageService.db
      ? (events as DexieCollection).sortBy('time')
      : (events as EventRecord[]).sort(compareEventsByTime);
  }

  /**
   *
   * @param conversationId The conversation ID
   * @param fromDate The lower date bound
   * @param toDate The upper date bound
   * @param limit The events limit
   * @param includes If from and to should be included
   */
  async _loadEventsInDateRange(
    conversationId: string,
    fromDate: Date,
    toDate: Date,
    limit: number,
    includes: Includes,
  ): Promise<DBEvents> {
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

    const records = await this.storageService.getAll<EventRecord>(StorageSchemata.OBJECT_STORE.EVENTS);
    return records
      .filter(record => {
        const recordDate = eventTimeToDate(record.time).getTime();
        return (
          record.conversation === conversationId &&
          (includeFrom ? recordDate >= fromDate.getTime() : recordDate > fromDate.getTime()) &&
          (includeTo ? recordDate <= toDate.getTime() : recordDate < toDate.getTime())
        );
      })
      .sort(compareEventsByConversation)
      .slice(0, limit);
  }

  /**
   * Save an unencrypted conversation event.
   * Will also recompute the category of the event to be stored.
   *
   * @param event JSON event to be stored
   */
  async saveEvent(event: Omit<EventRecord, 'primary_key' | 'category'>): Promise<EventRecord> {
    const categorizedEvent = {
      ...event,
      category: categoryFromEvent(event as EventRecord),
    };
    const savedEvent: EventRecord = {
      ...categorizedEvent,
      primary_key: await this.storageService.save(StorageSchemata.OBJECT_STORE.EVENTS, undefined, categorizedEvent),
    } as EventRecord;
    return savedEvent;
  }

  async replaceEvent<T extends IdentifiedUpdatePayload>(event: T): Promise<T> {
    await this.storageService.update(StorageSchemata.OBJECT_STORE.EVENTS, event.primary_key, event);
    return event;
  }

  addEventUpdatedListener(callback: DatabaseListenerCallback): void {
    this.storageService.addUpdatedListener(StorageSchemata.OBJECT_STORE.EVENTS, callback);
  }

  addEventDeletedListener(callback: DatabaseListenerCallback): void {
    this.storageService.addDeletedListener(StorageSchemata.OBJECT_STORE.EVENTS, callback);
  }

  /**
   * Update event as upload failed in database.
   *
   * @param primaryKey Primary key used to find an event in the database
   * @param reason Failure reason
   */
  async updateEventAsUploadFailed(
    primaryKey: string,
    reason: ProtobufAsset.NotUploaded | AssetTransferState,
  ): Promise<EventRecord | undefined> {
    const record = await this.storageService.load<EventRecord>(StorageSchemata.OBJECT_STORE.EVENTS, primaryKey);
    if (!record || record.type !== ClientEvent.CONVERSATION.ASSET_ADD) {
      this.logger.warn('Did not find message to update asset (failed)');
      return undefined;
    }
    record.data.reason = reason;
    record.data.status = AssetTransferState.UPLOAD_FAILED;
    await this.replaceEvent(record);
    this.logger.info('Updated asset message_et (failed)', primaryKey);
    return record;
  }

  /**
   * Update an unencrypted event.
   * A valid update must not contain a 'version' property.
   *
   * @param primaryKey event's primary key
   * @param updates Updates to perform on the message.
   */
  async updateEvent<T extends Partial<EventRecord>>(primaryKey: string, updates: T): Promise<IdentifiedUpdatePayload> {
    const hasNoChanges = !updates || !Object.keys(updates).length;
    if (hasNoChanges) {
      throw new ConversationError(ConversationError.TYPE.NO_CHANGES, ConversationError.MESSAGE.NO_CHANGES);
    }
    const hasVersionedUpdates = !!updates.version;
    if (hasVersionedUpdates) {
      const error = new ConversationError(ConversationError.TYPE.WRONG_CHANGE, ConversationError.MESSAGE.WRONG_CHANGE);
      error.message += ' Use the `updateEventSequentially` method to perform a versioned update of an event';
      throw error;
    }
    const identifiedUpdates = {...updates, primary_key: primaryKey};
    return this.replaceEvent(identifiedUpdates);
  }

  /**
   * Update an event in the database and checks that the update is sequential.
   *
   * @param primaryKey Event primary key
   * @param changes Changes to update message with
   */
  async updateEventSequentially(changes: IdentifiedUpdatePayload): Promise<number> {
    const hasVersionedChanges = !!changes.version;
    if (!hasVersionedChanges) {
      throw new ConversationError(ConversationError.TYPE.WRONG_CHANGE, ConversationError.MESSAGE.WRONG_CHANGE);
    }

    const {primary_key: primaryKey, ...updates} = changes;
    if (this.storageService.db) {
      // Create a DB transaction to avoid concurrent sequential update.
      return this.storageService.db.transaction('rw', StorageSchemata.OBJECT_STORE.EVENTS, async () => {
        const record = await this.storageService.load<LegacyEventRecord>(
          StorageSchemata.OBJECT_STORE.EVENTS,
          primaryKey,
        );
        if (!record) {
          throw new StorageError(StorageError.TYPE.NOT_FOUND, StorageError.MESSAGE.NOT_FOUND);
        }
        const databaseVersion = record.version || 1;
        const isSequentialUpdate = changes.version === databaseVersion + 1;
        if (isSequentialUpdate) {
          return this.storageService.update(StorageSchemata.OBJECT_STORE.EVENTS, primaryKey, updates);
        }
        const logMessage = 'Failed sequential database update';
        const logObject = {
          databaseVersion: databaseVersion,
          updateVersion: changes.version,
        };
        this.logger.error(logMessage, logObject);
        throw new StorageError(StorageError.TYPE.NON_SEQUENTIAL_UPDATE, StorageError.MESSAGE.NON_SEQUENTIAL_UPDATE);
      });
    }
    return this.storageService.update(StorageSchemata.OBJECT_STORE.EVENTS, primaryKey, updates);
  }

  /**
   * Delete an event from a conversation. Duplicates are delete as well.
   *
   * @param conversationId ID of conversation to remove message from
   * @param eventId ID of the actual message
   */
  async deleteEvent(conversationId: string, eventId: string): Promise<number> {
    return this.storageService.deleteEventInConversation(StorageSchemata.OBJECT_STORE.EVENTS, conversationId, eventId);
  }

  /**
   * Delete all events of a conversation.
   *
   * @param conversationId Delete events for this conversation
   * @param isoDate Date in ISO string format as upper bound which events should be removed
   */
  async deleteEvents(conversationId: string, isoDate?: string): Promise<number> {
    return this.storageService.deleteEventsByDate(StorageSchemata.OBJECT_STORE.EVENTS, conversationId, isoDate);
  }

  /**
   * Will move all the events from one conversation to another.
   * Events will get moved, not copied, so all the events from the source conversation will be deleted.
   * This is used when MLS 1:1 conversation is established and we need to move the events from proteus conversation.
   *
   * @param conversationId - conversation id from which events should be moved
   * @param newConversationId - conversation id to which events should be moved
   */
  public async moveEventsToConversation(conversationId: QualifiedId, newConversationId: QualifiedId) {
    const eventsToSkip = [CLIENT_CONVERSATION_EVENT.ONE2ONE_CREATION];

    const events = await this.loadAllConversationEvents(conversationId.id, eventsToSkip);

    const eventsToMove = events.map(event => ({
      ...event,
      conversation: newConversationId.id,
      qualified_conversation: newConversationId,
    }));

    return Promise.all(
      eventsToMove.map(event => {
        return this.storageService.save(StorageSchemata.OBJECT_STORE.EVENTS, event.primary_key, event);
      }),
    );
  }

  /**
   *
   * @param conversationId The conversation ID
   */
  async loadAllConversationEvents(
    conversationId: string,
    eventTypesToSkip: (CONVERSATION_EVENT | CLIENT_CONVERSATION_EVENT)[] = [],
  ): Promise<EventRecord[]> {
    try {
      if (this.storageService.db) {
        const events = await this.storageService.db
          .table(StorageSchemata.OBJECT_STORE.EVENTS)
          .where('conversation')
          .equals(conversationId)
          .and(record => !eventTypesToSkip.includes(record.type))
          .toArray();
        return events;
      }

      const records = await this.storageService.getAll<EventRecord>(StorageSchemata.OBJECT_STORE.EVENTS);
      return records;
    } catch (error) {
      const logMessage = `Failed to get events for conversation '${conversationId}': ${error.message}`;
      this.logger.error(logMessage, error);
      throw error;
    }
  }
}
