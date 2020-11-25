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

import {amplify} from 'amplify';
import ko from 'knockout';
import {groupBy} from 'underscore';
import {USER_EVENT} from '@wireapp/api-client/src/event';
import {WebAppEvents} from '@wireapp/webapp-events';

import {loadValue, resetStoreValue, storeValue} from 'Util/StorageUtil';

import type {ClientEntity} from '../client/ClientEntity';
import type {User} from '../entity/User';
import {PropertiesRepository} from '../properties/PropertiesRepository';

export interface Notification {
  data: ClientEntity | boolean;
  type: string;
}

interface GroupedNotifications {
  notification: Notification[];
  type: string;
}

/**
 * Take care of storing and keeping track of all the notifications relative to the user preferences (read receipts config, active devices ...)
 */
export class PreferenceNotificationRepository {
  public readonly notifications: ko.ObservableArray<Notification>;

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
   * @param selfUserObservable an observable that contains the self user
   */
  constructor(selfUserObservable: ko.Observable<User>) {
    const notificationsStorageKey = PreferenceNotificationRepository.CONFIG.STORAGE_KEY;
    const storedNotifications = loadValue<string>(notificationsStorageKey);
    this.notifications = ko.observableArray(storedNotifications ? JSON.parse(storedNotifications) : []);
    this.notifications.subscribe(notifications => {
      return notifications.length > 0
        ? storeValue(notificationsStorageKey, JSON.stringify(notifications))
        : resetStoreValue(notificationsStorageKey);
    });

    amplify.subscribe(WebAppEvents.USER.CLIENT_ADDED, (userId: string, clientEntity?: ClientEntity) => {
      if (userId === selfUserObservable().id) {
        this.onClientAdd(userId, clientEntity);
      }
    });
    amplify.subscribe(WebAppEvents.USER.CLIENT_REMOVED, (userId: string, clientId?: string) => {
      if (userId === selfUserObservable().id) {
        this.onClientRemove(userId, clientId);
      }
    });
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent.bind(this));
  }

  getNotifications(): GroupedNotifications[] {
    const notificationPriorities = [
      PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT,
      PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED,
    ];
    const prio = (item: GroupedNotifications) => notificationPriorities.indexOf(item.type);
    const notifications = this.notifications.removeAll();
    const groupedNotifications = groupBy(notifications, notification => notification.type);
    return Object.entries(groupedNotifications)
      .map(([type, notification]) => ({notification, type}))
      .sort((a, b) => prio(a) - prio(b));
  }

  onClientAdd(_userId: string, clientEntity?: ClientEntity): void {
    if (clientEntity) {
      this.notifications.push({
        data: clientEntity,
        type: PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT,
      });
    }
  }

  onClientRemove(_userId: string, clientId: string): void {
    this.notifications.remove(({data: clientEntity}) => {
      const isExpectedId = typeof clientEntity !== 'boolean' && clientEntity.id === clientId;
      return isExpectedId && (clientEntity as ClientEntity).isPermanent();
    });
  }

  onUserEvent(event: any): void {
    if (event.type === USER_EVENT.PROPERTIES_DELETE || event.type === USER_EVENT.PROPERTIES_SET) {
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
