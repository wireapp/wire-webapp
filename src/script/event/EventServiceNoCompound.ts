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

import {EventService} from './EventService';
import {StorageSchemata} from '../storage/StorageSchemata';
import {StorageService} from '../storage';
import {MessageCategory} from '../message/MessageCategory';

// TODO: These types should be moved to a more appropriate place (e.g. EventService) once it has been migrated to TS
type DBEvent = {category: MessageCategory; conversation: string; time: number};
type Includes = {includeFrom: boolean; includeTo: boolean};
type DateComparator = (dateA: Date, dateB: Date) => boolean;

// TODO: This function can be removed once Microsoft Edge's IndexedDB supports compound indices:
// - https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/
export class EventServiceNoCompound extends EventService {
  constructor(storageService: StorageService) {
    super(storageService);
  }

  /**
   * Get events with given category.
   *
   * @param conversationId ID of conversation to load events from
   * @param category Will be used as lower bound
   * @returns Resolves with matching events
   */
  async loadEventsWithCategory(conversationId: string, category: MessageCategory): Promise<DBEvent[]> {
    let events: DBEvent[];

    if (this.storageService.db) {
      events = await this.storageService.db
        .table(StorageSchemata.OBJECT_STORE.EVENTS)
        .where('conversation')
        .equals(conversationId)
        .sortBy('time');
    } else {
      const records: DBEvent[] = await this.storageService.getAll(StorageSchemata.OBJECT_STORE.EVENTS);
      events = records.filter(record => record.conversation === conversationId).sort((a, b) => a.time - b.time);
    }

    return events.filter(record => record.category >= category);
  }

  async _loadEventsInDateRange(
    conversationId: string,
    fromDate: Date,
    toDate: Date,
    limit: number,
    includes: Includes,
  ): Promise<DBEvent[]> {
    const fromCompareFunction: DateComparator = includes.includeFrom
      ? (date, timestamp) => timestamp >= date
      : (date, timestamp) => timestamp > date;
    const toCompareFunction: DateComparator = includes.includeTo
      ? (date, timestamp) => timestamp <= date
      : (date, timestamp) => timestamp < date;

    if (!(toDate instanceof Date) || !(fromDate instanceof Date)) {
      const errorMessage = `Lower bound (${typeof toDate}) and upper bound (${typeof fromDate}) must be of type 'Date'.`;
      throw new Error(errorMessage);
    }

    if (fromDate.getTime() > toDate.getTime()) {
      const errorMessage = `Lower bound (${toDate.getTime()}) cannot be greater than upper bound (${fromDate.getTime()}).`;
      throw new Error(errorMessage);
    }

    if (this.storageService.db) {
      return this.storageService.db
        .table(StorageSchemata.OBJECT_STORE.EVENTS)
        .where('conversation')
        .equals(conversationId)
        .and((record: DBEvent) => {
          const timestamp = new Date(record.time);
          return fromCompareFunction(fromDate, timestamp) && toCompareFunction(toDate, timestamp);
        })
        .limit(limit);
    }

    const records: DBEvent[] = await this.storageService.getAll(StorageSchemata.OBJECT_STORE.EVENTS);
    return records
      .filter(record => {
        const timestamp = new Date(record.time);
        return (
          record.conversation === conversationId &&
          fromCompareFunction(fromDate, timestamp) &&
          toCompareFunction(toDate, timestamp)
        );
      })
      .sort((a, b) => a.conversation.localeCompare(b.conversation))
      .slice(0, limit);
  }
}
