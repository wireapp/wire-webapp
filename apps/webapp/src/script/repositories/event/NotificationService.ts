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

import type {NotificationList} from '@wireapp/api-client/lib/notification/';
import {DatabaseKeys} from '@wireapp/core/lib/notification/NotificationDatabaseRepository';
import {StorageSchemata, StorageService} from 'Repositories/storage/';
import {container} from 'tsyringe';

import {APIClient} from '../../service/APIClientSingleton';

export class NotificationService {
  private readonly AMPLIFY_STORE_NAME: string;

  static get CONFIG() {
    return {
      PRIMARY_KEY_MISSED: 'z.storage.StorageKey.NOTIFICATION.MISSED',
      URL_NOTIFICATIONS: '/notifications',
      URL_NOTIFICATIONS_LAST: '/notifications/last',
    };
  }

  constructor(
    private readonly storageService = container.resolve(StorageService),
    private readonly apiClient = container.resolve(APIClient),
  ) {
    this.AMPLIFY_STORE_NAME = StorageSchemata.OBJECT_STORE.AMPLIFY;
  }

  /**
   * Get events from the notification stream.
   * @param clientId Only return notifications targeted at the given client
   * @param notificationId Only return notifications more recent than the given event ID (like
   *   "7130304a-c839-11e5-8001-22000b0fe035")
   * @param size Maximum number of notifications to return
   * @returns Resolves with a pages list of notifications
   */
  getNotifications(clientId?: string, notificationId?: string, size: number = 10000): Promise<NotificationList> {
    return this.apiClient.api.notification.getNotifications(clientId, size, notificationId);
  }

  async getServerTime(): Promise<string> {
    // Info: We use "100" as size limit because it's the minimum value accepted by the backend's notification stream
    const notificationList = await this.apiClient.api.notification.getNotifications(undefined, 100, undefined);
    return notificationList.time;
  }

  /**
   * Load missed ID from persistent storage.
   * @returns Resolves with the stored missed ID.
   */
  getMissedIdFromDb(): Promise<string | undefined> {
    return this.storageService
      .load<{value: string}>(this.AMPLIFY_STORE_NAME, NotificationService.CONFIG.PRIMARY_KEY_MISSED)
      .then(record => {
        if (record?.value) {
          return record.value;
        }
        return undefined;
      });
  }

  /**
   * Save last event date to persistent storage.
   * @param eventDate Event date (in ISO 8601) to be stored
   * @returns Resolves with the primary key of the stored record
   */
  saveLastEventDateToDb(eventDate: string): Promise<string> {
    return this.storageService.save(this.AMPLIFY_STORE_NAME, DatabaseKeys.PRIMARY_KEY_LAST_EVENT, {
      value: eventDate,
    });
  }

  /**
   * Save missed notifications ID to persistent storage.
   * @param notificationId Notification ID to be stored
   * @returns Resolves with the primary key of the stored record
   */
  saveMissedIdToDb(notificationId: string): Promise<string> {
    return this.storageService.save(this.AMPLIFY_STORE_NAME, NotificationService.CONFIG.PRIMARY_KEY_MISSED, {
      value: notificationId,
    });
  }
}
