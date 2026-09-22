/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {result} from 'true-myth';

import {systemNotificationErrorKinds} from 'src/script/notification/systemNotificationTypes';

import {createSystemNotificationApiFromBrowserNotification} from './createSystemNotificationApiFromBrowserNotification';

type CreatedNotification = {
  title: string;
  options: NotificationOptions | undefined;
  closeCallCount: number;
  onclick: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  close: () => void;
};

type NotificationConstructorFake = {
  notificationConstructor: typeof Notification;
  createdNotifications: CreatedNotification[];
};

const createNotificationConstructorFake = ({
  permission = 'granted',
  throwOnConstruction = false,
  throwOnClose = false,
}: {permission?: NotificationPermission; throwOnConstruction?: boolean; throwOnClose?: boolean} = {}): NotificationConstructorFake => {
  const createdNotifications: CreatedNotification[] = [];

  const notificationConstructor = function (title: string, options?: NotificationOptions) {
    if (throwOnConstruction) {
      throw new Error('notification could not be constructed');
    }

    const createdNotification: CreatedNotification = {
      title,
      options,
      closeCallCount: 0,
      onclick: null,
      onclose: null,
      onerror: null,
      close: () => {
        if (throwOnClose) {
          throw new Error('notification could not be closed');
        }

        createdNotification.closeCallCount += 1;
      },
    };

    createdNotifications.push(createdNotification);

    return createdNotification;
  };

  return {
    notificationConstructor: Object.assign(notificationConstructor, {permission}) as unknown as typeof Notification,
    createdNotifications,
  };
};

const createApi = (fakeOptions: Parameters<typeof createNotificationConstructorFake>[0] = {}) => {
  const {notificationConstructor, createdNotifications} = createNotificationConstructorFake(fakeOptions);
  const focusWindow = jest.fn();
  const publishNotificationClick = jest.fn();
  const logger = {warn: jest.fn()};

  const api = createSystemNotificationApiFromBrowserNotification({
    notificationConstructor,
    isSupported: () => true,
    focusWindow,
    publishNotificationClick,
    logger,
  });

  return {api, createdNotifications, focusWindow, publishNotificationClick, logger};
};

const request = {
  title: 'Weekly sync',
  body: 'Starts at 12:00 PM',
  tag: 'meeting-reminder:tag',
  onClick: jest.fn(),
  onClose: jest.fn(),
};

describe('createSystemNotificationApiFromBrowserNotification', () => {
  it('reports support from the injected predicate', () => {
    const {notificationConstructor} = createNotificationConstructorFake();
    const api = createSystemNotificationApiFromBrowserNotification({
      notificationConstructor,
      isSupported: () => false,
      focusWindow: jest.fn(),
      publishNotificationClick: jest.fn(),
      logger: {warn: jest.fn()},
    });

    expect(api.isSupported()).toBe(false);
  });

  it.each(['granted', 'denied', 'default'] as const)('reads the %s permission from the browser', permission => {
    const {api} = createApi({permission});

    expect(api.getPermission()).toBe(permission);
  });

  it('constructs a notification carrying the title, body and tag', () => {
    const {api, createdNotifications} = createApi();

    api.show({...request, onClick: jest.fn(), onClose: jest.fn()});

    expect(createdNotifications).toHaveLength(1);
    expect(createdNotifications.at(0)?.title).toBe('Weekly sync');
    expect(createdNotifications.at(0)?.options).toEqual({body: 'Starts at 12:00 PM', tag: 'meeting-reminder:tag'});
  });

  it('focuses the window and calls back when the notification is clicked', () => {
    const {api, createdNotifications, focusWindow} = createApi();
    const onClick = jest.fn();

    api.show({...request, onClick, onClose: jest.fn()});
    createdNotifications.at(0)?.onclick?.();

    expect(focusWindow).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('announces the click so the desktop app restores its window and switches account', () => {
    const {api, createdNotifications, publishNotificationClick} = createApi();

    api.show({...request, onClick: jest.fn(), onClose: jest.fn()});
    createdNotifications.at(0)?.onclick?.();

    expect(publishNotificationClick).toHaveBeenCalledTimes(1);
  });

  it('closes the underlying notification through the returned handle', () => {
    const {api, createdNotifications} = createApi();

    const handle = api.show({...request, onClick: jest.fn(), onClose: jest.fn()});

    expect(result.isOk(handle)).toBe(true);
    if (result.isOk(handle)) {
      expect(result.isOk(handle.value.close())).toBe(true);
    }
    expect(createdNotifications.at(0)?.closeCallCount).toBe(1);
  });

  it('calls back when the platform closes the notification without us', () => {
    const {api, createdNotifications} = createApi();
    const onClose = jest.fn();

    api.show({...request, onClose});
    createdNotifications.at(0)?.onclose?.();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('logs, closes and calls back when the notification errors after being shown', () => {
    const {api, createdNotifications, logger} = createApi();
    const onClose = jest.fn();

    api.show({...request, onClose});
    createdNotifications.at(0)?.onerror?.();

    expect(logger.warn).toHaveBeenCalledWith('system notification failed after being shown', {
      tag: 'meeting-reminder:tag',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(createdNotifications.at(0)?.closeCallCount).toBe(1);
  });

  it('reports a construction failure instead of throwing', () => {
    const {api} = createApi({throwOnConstruction: true});

    const handle = api.show({...request, onClick: jest.fn(), onClose: jest.fn()});

    expect(handle).toEqual(
      result.err({
        kind: systemNotificationErrorKinds.presentationFailed,
        cause: new Error('notification could not be constructed'),
      }),
    );
  });

  it('reports a close failure instead of throwing', () => {
    const {api} = createApi({throwOnClose: true});

    const handle = api.show({...request, onClick: jest.fn(), onClose: jest.fn()});

    expect(result.isOk(handle)).toBe(true);
    if (result.isOk(handle)) {
      expect(handle.value.close()).toEqual(
        result.err({
          kind: systemNotificationErrorKinds.closeFailed,
          cause: new Error('notification could not be closed'),
        }),
      );
    }
  });
});
