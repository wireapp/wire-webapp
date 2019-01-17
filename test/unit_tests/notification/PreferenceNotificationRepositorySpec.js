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
import UUID from 'uuidjs';

import PreferenceNotificationRepository from 'src/script/notification/PreferenceNotificationRepository';
import PropertiesRepository from 'src/script/properties/PropertiesRepository';
import backendEvent from 'src/script/event/Backend';

describe('PreferenceNotificationRepository', () => {
  const user = {id: UUID.genV4().hexString};
  const userObservable = () => user;

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
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);

    amplify.publish(z.event.WebApp.USER.EVENT_FROM_BACKEND, {
      key: PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key,
      type: backendEvent.USER.PROPERTIES_SET,
      value: true,
    });

    expect(preferenceNotificationRepository.notifications().length).toBe(1);
    expect(preferenceNotificationRepository.notifications()[0]).toEqual({
      data: true,
      type: PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED,
    });
  });

  it('adds new notification when new device is added for self user', () => {
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);
    const newClientData = {};

    amplify.publish(z.event.WebApp.USER.CLIENT_ADDED, user.id, newClientData);

    expect(preferenceNotificationRepository.notifications().length).toBe(1);
    expect(preferenceNotificationRepository.notifications()[0]).toEqual({
      data: newClientData,
      type: PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT,
    });
  });

  it('ignores new device notification if not from the self user', () => {
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);
    const newClientData = {};

    amplify.publish(z.event.WebApp.USER.CLIENT_ADDED, UUID.genV4().hexString, newClientData);

    expect(preferenceNotificationRepository.notifications().length).toBe(0);
  });

  it('stores in local storage any notification added', () => {
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);

    const notifications = [{data: 1, type: 'preference-changed'}, {data: 2, type: 'device-changed'}];

    amplify.store.calls.reset();
    notifications.forEach((notification, index) => {
      preferenceNotificationRepository.notifications.push(notification);

      expect(amplify.store).toHaveBeenCalledTimes(index + 1);
    });
  });

  it('restores saved notifications from local storage', () => {
    const storedNotifications = [{data: 1, type: 'type-1'}, {data: 2, type: 'type-2'}];
    amplify.store.and.returnValue(JSON.stringify(storedNotifications));
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);

    expect(preferenceNotificationRepository.notifications().length).toBe(storedNotifications.length);
    expect(JSON.stringify(preferenceNotificationRepository.notifications())).toBe(JSON.stringify(storedNotifications));
  });

  it('groups and prioritizes notifications when popped', () => {
    const storedNotifications = [
      {
        data: 2,
        type: PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED,
      },
      {
        data: 1,
        type: PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT,
      },
    ];

    amplify.store.and.returnValue(JSON.stringify(storedNotifications));
    const preferenceNotificationRepository = new PreferenceNotificationRepository(userObservable);

    let nextNotification = preferenceNotificationRepository.popNotification();

    expect(nextNotification.type).toBe(PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT);
    expect(preferenceNotificationRepository.notifications().length).toBe(storedNotifications.length - 1);

    nextNotification = preferenceNotificationRepository.popNotification();

    expect(nextNotification.type).toBe(
      PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED
    );

    expect(preferenceNotificationRepository.notifications().length).toBe(storedNotifications.length - 2);
  });
});
