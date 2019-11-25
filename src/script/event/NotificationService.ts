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

import {CONVERSATION_EVENT} from '@wireapp/api-client/dist/event';
import {Notification, NotificationList} from '@wireapp/api-client/dist/notification';
import {DatabaseKeys} from '@wireapp/core/dist/notification/NotificationDatabaseRepository';
import {Logger, getLogger} from 'Util/Logger';
import {EventRecord, StorageSchemata, StorageService} from '../storage/';

export class NotificationService {
  private readonly backendClient: any;
  private readonly logger: Logger;
  private readonly storageService: StorageService;
  private readonly AMPLIFY_STORE_NAME: string;

  static get CONFIG(): {
    PRIMARY_KEY_MISSED: string;
    URL_NOTIFICATIONS: string;
    URL_NOTIFICATIONS_LAST: string;
  } {
    return {
      PRIMARY_KEY_MISSED: 'z.storage.StorageKey.NOTIFICATION.MISSED',
      URL_NOTIFICATIONS: '/notifications',
      URL_NOTIFICATIONS_LAST: '/notifications/last',
    };
  }

  constructor(backendClient: any, storageService: StorageService) {
    this.backendClient = backendClient;
    this.storageService = storageService;
    this.logger = getLogger('NotificationService');
    this.AMPLIFY_STORE_NAME = StorageSchemata.OBJECT_STORE.AMPLIFY;
  }

  /**
   * Get events from the notification stream.
   * @param clientId - Only return notifications targeted at the given client
   * @param notificationId - Only return notifications more recent than the given event ID (like
   *   "7130304a-c839-11e5-8001-22000b0fe035")
   * @param size - Maximum number of notifications to return
   * @returns Resolves with a pages list of notifications
   */
  getNotifications(clientId?: string, notificationId?: string, size: number = 10000): Promise<NotificationList> {
    return this.backendClient.sendRequest({
      data: {
        client: clientId,
        since: notificationId,
        size: size,
      },
      type: 'GET',
      url: NotificationService.CONFIG.URL_NOTIFICATIONS,
    });
  }

  async getServerTime(): Promise<string> {
    // Info: We use "100" as size limit because it's the minimum value accepted by the backend's notification stream
    const notificationList = await this.getNotifications(undefined, undefined, 100);
    return notificationList.time;
  }

  getAllNotificationsForClient(clientId: string, notificationId?: string): Promise<Notification[]> {
    const notifications: Notification[] = [];

    const collectNotifications = async (lastNotificationId?: string): Promise<Notification[]> => {
      const notificationList = await this.getNotifications(clientId, lastNotificationId);
      const newNotifications = notificationList.notifications;
      if (newNotifications.length > 0) {
        lastNotificationId = newNotifications[newNotifications.length - 1].id;
        notifications.push(...newNotifications);
      }
      return notificationList.has_more ? collectNotifications(lastNotificationId) : notifications;
    };

    return collectNotifications(notificationId);
  }

  /**
   * Get the last notification for a given client.
   * @param clientId - Only return notifications targeted at the given client
   * @returns Resolves with the last known notification for given client
   */
  getNotificationsLast(clientId: string): Promise<Notification> {
    return this.backendClient.sendRequest({
      data: {
        client: clientId,
      },
      type: 'GET',
      url: NotificationService.CONFIG.URL_NOTIFICATIONS_LAST,
    });
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
        throw new z.error.EventError(z.error.EventError.TYPE.DATABASE_FAILURE);
      })
      .then(record => {
        if (record && record.value) {
          return record.value;
        }
        throw new z.error.EventError(z.error.EventError.TYPE.NO_LAST_DATE);
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
        throw new z.error.EventError(z.error.EventError.TYPE.DATABASE_FAILURE);
      })
      .then(record => {
        if (record && record.value) {
          return record.value;
        }
        throw new z.error.EventError(z.error.EventError.TYPE.NO_LAST_ID);
      });
  }

  /**
   * Load missed ID from persistent storage.
   * @returns {Promise} Resolves with the stored missed ID.
   */
  getMissedIdFromDb(): Promise<string | undefined> {
    return this.storageService
      .load<{value: string}>(this.AMPLIFY_STORE_NAME, NotificationService.CONFIG.PRIMARY_KEY_MISSED)
      .then(record => {
        if (record && record.value) {
          return record.value;
        }
        return undefined;
      });
  }

  /**
   * Save last event date to persistent storage.
   * @param eventDate - Event date (in ISO 8601) to be stored
   * @returns Resolves with the primary key of the stored record
   */
  saveLastEventDateToDb(eventDate: string): Promise<string> {
    return this.storageService.save(this.AMPLIFY_STORE_NAME, DatabaseKeys.PRIMARY_KEY_LAST_EVENT, {
      value: eventDate,
    });
  }

  /**
   * Save last notification ID to persistent storage.
   * @param notificationId - Notification ID to be stored
   * @returns Resolves with the primary key of the stored record
   */
  saveLastNotificationIdToDb(notificationId: string): Promise<string> {
    return this.storageService.save(this.AMPLIFY_STORE_NAME, DatabaseKeys.PRIMARY_KEY_LAST_NOTIFICATION, {
      value: notificationId,
    });
  }

  /**
   * Save missed notifications ID to persistent storage.
   * @param notificationId - Notification ID to be stored
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
      message = Object.values(this.storageService.objectDb.events).filter(event => event.id === messageId)[0];
    } else {
      message = await this.storageService.db
        .table(StorageSchemata.OBJECT_STORE.EVENTS)
        .where({id: messageId})
        .first();
    }

    const {notifications} = await this.getNotifications(clientId);

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
