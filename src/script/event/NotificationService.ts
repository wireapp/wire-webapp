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

import type {NotificationList} from '@wireapp/api-client/src/notification/';
import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event';
import type {Notification} from '@wireapp/api-client/src/notification';
import {DatabaseKeys} from '@wireapp/core/src/main/notification/NotificationDatabaseRepository';
import {container} from 'tsyringe';

import {Logger, getLogger} from 'Util/Logger';

import {EventRecord, StorageSchemata, StorageService} from '../storage/';
import {EventError} from '../error/EventError';
import {APIClient} from '../service/APIClientSingleton';

export class NotificationService {
  private readonly logger: Logger;
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
    this.logger = getLogger('NotificationService');
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
    return this.apiClient.notification.api.getNotifications(clientId, size, notificationId);
  }

  async getServerTime(): Promise<string> {
    // Info: We use "100" as size limit because it's the minimum value accepted by the backend's notification stream
    const notificationList = await this.apiClient.notification.api.getNotifications(undefined, 100, undefined);
    return notificationList.time;
  }

  getAllNotificationsForClient(clientId: string, notificationId?: string): Promise<Notification[]> {
    return this.apiClient.notification.api.getAllNotifications(clientId, notificationId);
  }

  /**
   * Get the last notification for a given client.
   * @param clientId Only return notifications targeted at the given client
   * @returns Resolves with the last known notification for given client
   */
  getNotificationsLast(clientId: string): Promise<Notification> {
    return this.apiClient.notification.api.getLastNotification(clientId);
  }

  /**
   * Load latest event date from persistent storage.
   * @returns Resolves with the date in ISO 8601 format from the latest event stored in local database
   */
  getLastEventDateFromDb(): Promise<string> {
    return this.storageService
      .load<{value: string}>(this.AMPLIFY_STORE_NAME, DatabaseKeys.PRIMARY_KEY_LAST_EVENT)
      .catch(error => {
        this.logger.error(`Failed to get last event timestamp from storage: ${error.message}`, error);
        throw new EventError(EventError.TYPE.DATABASE_FAILURE, EventError.MESSAGE.DATABASE_FAILURE);
      })
      .then(record => {
        if (record?.value) {
          return record.value;
        }
        throw new EventError(EventError.TYPE.NO_LAST_DATE, EventError.MESSAGE.NO_LAST_DATE);
      });
  }

  /**
   * Load last notifications ID from persistent storage.
   * @returns Resolves with the stored last notification ID (UUIDv4)
   */
  getLastNotificationIdFromDb(): Promise<string> {
    return this.storageService
      .load<{value: string}>(this.AMPLIFY_STORE_NAME, DatabaseKeys.PRIMARY_KEY_LAST_NOTIFICATION)
      .catch(error => {
        this.logger.error(`Failed to get last notification ID from storage: ${error.message}`, error);
        throw new EventError(EventError.TYPE.DATABASE_FAILURE, EventError.MESSAGE.DATABASE_FAILURE);
      })
      .then(record => {
        if (record?.value) {
          return record.value;
        }
        throw new EventError(EventError.TYPE.NO_LAST_ID, EventError.MESSAGE.NO_LAST_ID);
      });
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
   * Save last notification ID to persistent storage.
   * @param notificationId Notification ID to be stored
   * @returns Resolves with the primary key of the stored record
   */
  saveLastNotificationIdToDb(notificationId: string): Promise<string> {
    return this.storageService.save(this.AMPLIFY_STORE_NAME, DatabaseKeys.PRIMARY_KEY_LAST_NOTIFICATION, {
      value: notificationId,
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

  async getNotificationIdByMessageId(messageId: string, clientId: string): Promise<string | void> {
    let message: EventRecord;

    if (this.storageService.isTemporaryAndNonPersistent) {
      const events = await this.storageService.getAll<EventRecord>(StorageSchemata.OBJECT_STORE.EVENTS);
      message = Object.values(events).filter(event => event.id === messageId)[0];
    } else {
      message = await this.storageService.db.table(StorageSchemata.OBJECT_STORE.EVENTS).where({id: messageId}).first();
    }

    const {notifications} = await this.apiClient.notification.api.getNotifications(clientId);

    for (const notification of notifications) {
      const matchedEvent = notification.payload.find(event => {
        return (
          event.type === CONVERSATION_EVENT.OTR_MESSAGE_ADD &&
          event.time === message.time &&
          event.from === message.from &&
          event.conversation === message.conversation
        );
      });

      if (matchedEvent) {
        return notification.id;
      }
    }
  }
}
