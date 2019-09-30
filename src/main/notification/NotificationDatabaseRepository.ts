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

import {BackendEvent} from '@wireapp/api-client/dist/commonjs/event';
import {Notification} from '@wireapp/api-client/dist/commonjs/notification/';
import {CRUDEngine} from '@wireapp/store-engine';
import {CryptographyDatabaseRepository} from '../cryptography/CryptographyDatabaseRepository';

export enum DatabaseStores {
  EVENTS = 'events',
}

export enum DatabaseKeys {
  PRIMARY_KEY_LAST_EVENT = 'z.storage.StorageKey.EVENT.LAST_DATE',
  PRIMARY_KEY_LAST_NOTIFICATION = 'z.storage.StorageKey.NOTIFICATION.LAST_ID',
}

const STORE_AMPLIFY = CryptographyDatabaseRepository.STORES.AMPLIFY;

export class NotificationDatabaseRepository {
  constructor(private readonly storeEngine: CRUDEngine) {}

  public getNotificationEventList(): Promise<BackendEvent[]> {
    return this.storeEngine.readAll<BackendEvent>(DatabaseStores.EVENTS);
  }

  public async getLastEventDate(): Promise<Date> {
    const {value} = await this.storeEngine.read<{
      value: string;
    }>(STORE_AMPLIFY, DatabaseKeys.PRIMARY_KEY_LAST_EVENT);
    return new Date(value);
  }

  public async updateLastEventDate(eventDate: Date): Promise<Date> {
    await this.storeEngine.update(STORE_AMPLIFY, DatabaseKeys.PRIMARY_KEY_LAST_EVENT, {value: eventDate.toISOString()});
    return eventDate;
  }

  public async createLastEventDate(eventDate: Date): Promise<Date> {
    await this.storeEngine.create(STORE_AMPLIFY, DatabaseKeys.PRIMARY_KEY_LAST_EVENT, {value: eventDate.toISOString()});
    return eventDate;
  }

  public async getLastNotificationId(): Promise<string> {
    const {value} = await this.storeEngine.read<{
      value: string;
    }>(STORE_AMPLIFY, DatabaseKeys.PRIMARY_KEY_LAST_NOTIFICATION);
    return value;
  }

  public async updateLastNotificationId(lastNotification: Notification): Promise<string> {
    await this.storeEngine.updateOrCreate(STORE_AMPLIFY, DatabaseKeys.PRIMARY_KEY_LAST_NOTIFICATION, {
      value: lastNotification.id,
    });
    return lastNotification.id;
  }
}
