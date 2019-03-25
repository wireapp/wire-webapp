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

import {Notification, NotificationEvent} from '@wireapp/api-client/dist/commonjs/notification/';
import {CRUDEngine} from '@wireapp/store-engine';
import CryptographyDatabaseRepository from '../cryptography/CryptographyDatabaseRepository';

export enum DatabaseStores {
  EVENTS = 'events',
}

export enum DatabaseKeys {
  PRIMARY_KEY_LAST_EVENT = 'z.storage.StorageKey.EVENT.LAST_DATE',
  PRIMARY_KEY_LAST_NOTIFICATION = 'z.storage.StorageKey.NOTIFICATION.LAST_ID',
}

export default class NotificationDatabaseRepository {
  public static readonly STORES = DatabaseStores;
  public static readonly KEYS = DatabaseKeys;

  constructor(private readonly storeEngine: CRUDEngine) {}

  public getNotificationEventList(): Promise<NotificationEvent[]> {
    return this.storeEngine.readAll<NotificationEvent>(NotificationDatabaseRepository.STORES.EVENTS);
  }

  public getLastEventDate(): Promise<Date> {
    return this.storeEngine
      .read<{value: string}>(
        CryptographyDatabaseRepository.STORES.AMPLIFY,
        NotificationDatabaseRepository.KEYS.PRIMARY_KEY_LAST_EVENT
      )
      .then(({value}) => new Date(value));
  }

  public updateLastEventDate(eventDate: Date): Promise<Date> {
    return this.storeEngine
      .update(
        CryptographyDatabaseRepository.STORES.AMPLIFY,
        NotificationDatabaseRepository.KEYS.PRIMARY_KEY_LAST_EVENT,
        {value: eventDate.toISOString()}
      )
      .then(() => eventDate);
  }

  public createLastEventDate(eventDate: Date): Promise<Date> {
    return this.storeEngine
      .create(
        CryptographyDatabaseRepository.STORES.AMPLIFY,
        NotificationDatabaseRepository.KEYS.PRIMARY_KEY_LAST_EVENT,
        {value: eventDate.toISOString()}
      )
      .then(() => eventDate);
  }

  public getLastNotificationId(): Promise<string> {
    return this.storeEngine
      .read<{value: string}>(
        CryptographyDatabaseRepository.STORES.AMPLIFY,
        NotificationDatabaseRepository.KEYS.PRIMARY_KEY_LAST_NOTIFICATION
      )
      .then(({value}) => value);
  }

  public updateLastNotificationId(lastNotification: Notification): Promise<string> {
    return this.storeEngine
      .update(
        CryptographyDatabaseRepository.STORES.AMPLIFY,
        NotificationDatabaseRepository.KEYS.PRIMARY_KEY_LAST_NOTIFICATION,
        {value: lastNotification.id}
      )
      .then(() => lastNotification.id);
  }

  public createLastNotificationId(lastNotification: Notification): Promise<string> {
    return this.storeEngine
      .create(
        CryptographyDatabaseRepository.STORES.AMPLIFY,
        NotificationDatabaseRepository.KEYS.PRIMARY_KEY_LAST_NOTIFICATION,
        {value: lastNotification.id}
      )
      .then(() => lastNotification.id);
  }
}
