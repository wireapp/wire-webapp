/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {groupBy} from 'underscore';
import {amplify} from 'amplify';

import PropertiesRepository from '../properties/PropertiesRepository';
import backendEvent from '../event/Backend';
import * as StorageUtil from 'utils/StorageUtil';

/**
 * Take care of storing and keeping track of all the notifications relative to the user preferences (read receipts config, active devices ...)
 */
class PreferenceNotificationRepository {
  static get CONFIG() {
    return {
      NOTIFICATION_TYPES: {
        NEW_CLIENT: 'new-client',
        READ_RECEIPTS_CHANGED: 'read-receipt-changed',
      },
      STORAGE_KEY: 'preferences_notifications',
    };
  }

  /**
   * Construct a new PreferenceNotificationRepository.
   *
   * @param {Observable<User>} selfUserObservable - an observable that contains the self user
   */
  constructor(selfUserObservable) {
    const notificationsStorageKey = PreferenceNotificationRepository.CONFIG.STORAGE_KEY;
    const storedNotifications = StorageUtil.getValue(notificationsStorageKey);
    this.notifications = ko.observableArray(storedNotifications ? JSON.parse(storedNotifications) : []);
    this.notifications.subscribe(notifications => {
      return notifications.length > 0
        ? StorageUtil.setValue(notificationsStorageKey, JSON.stringify(notifications))
        : StorageUtil.resetValue(notificationsStorageKey);
    });

    const executeIfSelfUser = callback => {
      return (userId, data) => {
        if (userId === selfUserObservable().id) {
          callback(userId, data);
        }
      };
    };

    amplify.subscribe(z.event.WebApp.USER.CLIENT_ADDED, executeIfSelfUser(this.onClientAdd.bind(this)));
    amplify.subscribe(z.event.WebApp.USER.CLIENT_REMOVED, executeIfSelfUser(this.onClientRemove.bind(this)));
    amplify.subscribe(z.event.WebApp.USER.EVENT_FROM_BACKEND, this.onUserEvent.bind(this));
  }

  popNotification() {
    if (!this.notifications().length) {
      return;
    }
    const notificationPriorities = [
      PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT,
      PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED,
    ];
    const groupedNotifications = groupBy(this.notifications(), notification => notification.type);
    for (const type of notificationPriorities) {
      if (groupedNotifications[type]) {
        this.notifications.remove(notification => notification.type === type);
        return {notification: groupedNotifications[type], type};
      }
    }
  }

  onClientAdd(userId, clientEntity) {
    this.notifications.push({
      data: clientEntity,
      type: PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT,
    });
  }

  onClientRemove(userId, clientId) {
    this.notifications.remove(({data: clientEntity}) => {
      const isExpectedId = clientEntity.id === clientId;
      return isExpectedId && clientEntity.isPermanent();
    });
  }

  onUserEvent(event) {
    if (event.type === backendEvent.USER.PROPERTIES_DELETE || event.type === backendEvent.USER.PROPERTIES_SET) {
      if (event.key === PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key) {
        const defaultValue = !!PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.defaultValue;
        this.notifications.push({
          data: event.value === undefined ? defaultValue : !!event.value,
          type: PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED,
        });
      }
    }
  }
}

export default PreferenceNotificationRepository;
