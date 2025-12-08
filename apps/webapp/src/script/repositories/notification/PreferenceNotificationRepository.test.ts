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

import {USER_EVENT} from '@wireapp/api-client/lib/event/';
import {amplify} from 'amplify';
import ko from 'knockout';

import {WebAppEvents} from '@wireapp/webapp-events';

import {ClientEntity} from 'Repositories/client/ClientEntity';
import {User} from 'Repositories/entity/User';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {createUuid} from 'Util/uuid';

import {Notification, PreferenceNotificationRepository} from './PreferenceNotificationRepository';

describe('PreferenceNotificationRepository', () => {
  const user = new User(createUuid(), null);
  const userObservable = ko.observable(user);

  beforeEach(() => {
    spyOn(amplify, 'store').and.callFake(() => {});
  });

  it('subscribes to preference change events', () => {
    spyOn(amplify, 'subscribe').and.callFake(() => {});

    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);

    expect(amplify.subscribe).toHaveBeenCalledTimes(3);
    expect(preferenceNotificationRepository.notifications().length).toBe(0);
  });

  it('adds new notification when read receipt settings are changed', () => {
    amplify.unsubscribeAll(WebAppEvents.USER.EVENT_FROM_BACKEND);
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);

    amplify.publish(WebAppEvents.USER.EVENT_FROM_BACKEND, {
      key: PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key,
      type: USER_EVENT.PROPERTIES_SET,
      value: true,
    });

    expect(preferenceNotificationRepository.notifications().length).toBe(1);
    expect(preferenceNotificationRepository.notifications()[0]).toEqual({
      data: true,
      type: PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED,
    });
  });

  it('adds new notification when new device is added for self user', () => {
    amplify.unsubscribeAll(WebAppEvents.USER.CLIENT_ADDED);
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);
    const newClientData = new ClientEntity(true, '');
    const {type, id, domain, model, time} = newClientData;

    amplify.publish(WebAppEvents.USER.CLIENT_ADDED, user.qualifiedId, newClientData);

    expect(preferenceNotificationRepository.notifications().length).toBe(1);
    expect(preferenceNotificationRepository.notifications()[0]).toEqual({
      data: {domain, id, model, time, type},
      type: PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT,
    });
  });

  it('ignores new device notification if not from the self user', () => {
    amplify.unsubscribeAll(WebAppEvents.USER.CLIENT_ADDED);
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);
    const newClientData = new ClientEntity(true, '');

    amplify.publish(WebAppEvents.USER.CLIENT_ADDED, {domain: '', id: createUuid()}, newClientData);

    expect(preferenceNotificationRepository.notifications().length).toBe(0);
  });

  it('stores in local storage any notification added', () => {
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);

    const notifications: Notification[] = [
      {data: true, type: 'preference-changed'},
      {data: false, type: 'device-changed'},
    ];

    (amplify.store as any).calls.reset();
    notifications.forEach((notification, index) => {
      preferenceNotificationRepository.notifications.push(notification);

      expect(amplify.store).toHaveBeenCalledTimes(index + 1);
    });
  });

  it('restores saved notifications from local storage', () => {
    const storedNotifications: Notification[] = [
      {data: true, type: 'type-1'},
      {data: false, type: 'type-2'},
    ];
    (amplify.store as any).and.returnValue(JSON.stringify(storedNotifications));
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);

    expect(preferenceNotificationRepository.notifications().length).toBe(storedNotifications.length);
    expect(JSON.stringify(preferenceNotificationRepository.notifications())).toBe(JSON.stringify(storedNotifications));
  });

  it('returns notifications sorted by priority', () => {
    const storedNotifications: Notification[] = [
      {
        data: false,
        type: PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED,
      },
      {
        data: true,
        type: PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT,
      },
    ];

    (amplify.store as any).and.returnValue(JSON.stringify(storedNotifications));
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);

    const notifications = preferenceNotificationRepository.getNotifications();

    expect(notifications[0].type).toBe(PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT);
    expect(notifications[1].type).toBe(
      PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED,
    );

    expect(preferenceNotificationRepository.notifications().length).toBe(0);
  });
});
