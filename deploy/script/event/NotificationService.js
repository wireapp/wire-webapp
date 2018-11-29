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

z.event.NotificationService = class NotificationService {
  static get CONFIG() {
    return {
      PRIMARY_KEY_LAST_EVENT: 'z.storage.StorageKey.EVENT.LAST_DATE',
      PRIMARY_KEY_LAST_NOTIFICATION: 'z.storage.StorageKey.NOTIFICATION.LAST_ID',
      PRIMARY_KEY_MISSED: 'z.storage.StorageKey.NOTIFICATION.MISSED',
      URL_NOTIFICATIONS: '/notifications',
      URL_NOTIFICATIONS_LAST: '/notifications/last',
    };
  }

  /**
   * Construct a new Notification Service.
   *
   * @param {z.service.BackendClient} backendClient - Client for the API calls
   * @param {z.storage.StorageService} storageService - Service for all storage related tasks
   */
  constructor(backendClient, storageService) {
    this.backendClient = backendClient;
    this.storageService = storageService;
    this.logger = new z.util.Logger('z.event.NotificationService', z.config.LOGGER.OPTIONS);

    this.AMPLIFY_STORE_NAME = z.storage.StorageSchemata.OBJECT_STORE.AMPLIFY;
  }

  /**
   * Get notifications from the stream.
   *
   * @param {string} clientId - Only return notifications targeted at the given client
   * @param {string} notificationId - Only return notifications more recent than this notification ID (like "7130304a-c839-11e5-8001-22000b0fe035")
   * @param {number} size - Maximum number of notifications to return
   * @returns {Promise} Resolves with the retrieved notifications
   */
  getNotifications(clientId, notificationId, size) {
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

  /**
   * Get the last notification for a given client.
   * @param {string} clientId - Client ID to retrieve notification ID for
   * @returns {Promise} Resolves with the last known notification ID for given client
   */
  getNotificationsLast(clientId) {
    return this.backendClient.sendRequest({
      data: {
        client: clientId,
      },
      type: 'GET',
      url: NotificationService.CONFIG.URL_NOTIFICATIONS_LAST,
    });
  }

  /**
   * Load last event date from storage.
   * @returns {Promise} Resolves with the stored last event date.
   */
  getLastEventDateFromDb() {
    return this.storageService
      .load(this.AMPLIFY_STORE_NAME, NotificationService.CONFIG.PRIMARY_KEY_LAST_EVENT)
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
   * Load last notifications ID from storage.
   * @returns {Promise} Resolves with the stored last notification ID.
   */
  getLastNotificationIdFromDb() {
    return this.storageService
      .load(this.AMPLIFY_STORE_NAME, NotificationService.CONFIG.PRIMARY_KEY_LAST_NOTIFICATION)
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
   * Load missed ID from storage.
   * @returns {Promise} Resolves with the stored missed ID.
   */
  getMissedIdFromDb() {
    return this.storageService
      .load(this.AMPLIFY_STORE_NAME, NotificationService.CONFIG.PRIMARY_KEY_MISSED)
      .then(record => {
        if (record && record.value) {
          return record.value;
        }
      });
  }

  /**
   * Save last event date to storage.
   * @param {string} eventDate - Event date to be stored
   * @returns {Promise} Resolves with the stored record
   */
  saveLastEventDateToDb(eventDate) {
    return this.storageService.save(this.AMPLIFY_STORE_NAME, NotificationService.CONFIG.PRIMARY_KEY_LAST_EVENT, {
      value: eventDate,
    });
  }

  /**
   * Save last notifications ID to storage.
   * @param {string} notificationId - Notification ID to be stored
   * @returns {Promise} Resolves with the stored record
   */
  saveLastNotificationIdToDb(notificationId) {
    return this.storageService.save(this.AMPLIFY_STORE_NAME, NotificationService.CONFIG.PRIMARY_KEY_LAST_NOTIFICATION, {
      value: notificationId,
    });
  }

  /**
   * Save missed notifications ID to storage.
   * @param {string} notificationId - Notification ID to be stored
   * @returns {Promise} Resolves with the stored record
   */
  saveMissedIdToDb(notificationId) {
    return this.storageService.save(this.AMPLIFY_STORE_NAME, NotificationService.CONFIG.PRIMARY_KEY_MISSED, {
      value: notificationId,
    });
  }
};
