/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
      PRIMARY_KEY_LAST_NOTIFICATION: 'z.storage.StorageKey.NOTIFICATION.LAST_ID',
      URL_NOTIFICATIONS: '/notifications',
      URL_NOTIFICATIONS_LAST: '/notifications/last',
    };
  }

  /**
   * Construct a new Notification Service.
   *
   * @param {z.service.BackendClient} client - Client for the API calls
   * @param {z.storage.StorageService} storage_service - Service for all storage related tasks
   */
  constructor(client, storage_service) {
    this.get_last_notification_id_from_db = this.get_last_notification_id_from_db.bind(this);
    this.save_last_notification_id_to_db = this.save_last_notification_id_to_db.bind(this);
    this.client = client;
    this.storage_service = storage_service;
    this.logger = new z.util.Logger('z.event.NotificationService', z.config.LOGGER.OPTIONS);
  }

  /**
   * Get notifications from the stream.
   *
   * @param {string} client_id - Only return notifications targeted at the given client
   * @param {string} notification_id - Only return notifications more recent than this notification ID (like "7130304a-c839-11e5-8001-22000b0fe035")
   * @param {number} size - Maximum number of notifications to return
   * @returns {Promise} Resolves with the retrieved notifications
   */
  get_notifications(client_id, notification_id, size) {
    return this.client.send_request({
      data: {
        client: client_id,
        since: notification_id,
        size: size,
      },
      type: 'GET',
      url: this.client.create_url(NotificationService.CONFIG.URL_NOTIFICATIONS),
    });
  }

  /**
   * Get the last notification for a given client.
   * @param {string} client_id - Client ID to retrieve notification ID for
   * @returns {Promise} Resolves with the last known notification ID for given client
   */
  get_notifications_last(client_id) {
    return this.client.send_request({
      data: {
        client: client_id,
      },
      type: 'GET',
      url: this.client.create_url(NotificationService.CONFIG.URL_NOTIFICATIONS_LAST),
    });
  }

  /**
   * Load last notifications id from storage.
   * @returns {Promise} Resolves with the stored last notification ID.
   */
  get_last_notification_id_from_db() {
    return this.storage_service.load(z.storage.StorageService.OBJECT_STORE.AMPLIFY, NotificationService.CONFIG.PRIMARY_KEY_LAST_NOTIFICATION)
      .catch((error) => {
        this.logger.error(`Failed to get last notification ID from storage: ${error.message}`, error);
        throw new z.event.EventError(z.event.EventError.TYPE.DATABASE_FAILURE);
      })
      .then((record) => {
        if (record && record.value) {
          return record.value;
        }
        throw new z.event.EventError(z.event.EventError.TYPE.NO_LAST_ID);
      });
  }

  /**
   * Save last notifications id from storage.
   * @param {string} notification_id - Notification ID to be stored
   * @returns {Promise} Resolves with the stored record
   */
  save_last_notification_id_to_db(notification_id) {
    return this.storage_service.save(z.storage.StorageService.OBJECT_STORE.AMPLIFY, NotificationService.CONFIG.PRIMARY_KEY_LAST_NOTIFICATION, {value: notification_id});
  }
};
