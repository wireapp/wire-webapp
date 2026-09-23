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

import assert from 'node:assert';

import {result} from 'true-myth';

import {
  systemNotificationErrorKinds,
  type SystemNotificationPermission,
} from 'src/script/notification/systemNotificationTypes';

import {
  createSystemNotificationApiFromBrowserNotification,
  type PlatformNotification,
  type PlatformNotificationRequest,
} from './createSystemNotificationApiFromBrowserNotification';

type CreatedNotification = {
  request: PlatformNotificationRequest;
  closeCallCount: number;
  clickListener: (() => void) | null;
  closeListener: (() => void) | null;
  errorListener: ((event: unknown) => void) | null;
};

type PlatformFakeOptions = {
  throwOnConstruction?: boolean;
  throwOnClose?: boolean;
};

type PlatformFake = {
  createNotification: (request: PlatformNotificationRequest) => PlatformNotification;
  createdNotifications: CreatedNotification[];
};

const createPlatformFake = ({
  throwOnConstruction = false,
  throwOnClose = false,
}: PlatformFakeOptions = {}): PlatformFake => {
  const createdNotifications: CreatedNotification[] = [];

  return {
    createdNotifications,
    createNotification: request => {
      if (throwOnConstruction) {
        throw new Error('notification could not be constructed');
      }

      const createdNotification: CreatedNotification = {
        request,
        closeCallCount: 0,
        clickListener: null,
        closeListener: null,
        errorListener: null,
      };

      createdNotifications.push(createdNotification);

      return {
        onClick: listener => {
          createdNotification.clickListener = listener;
        },
        onClose: listener => {
          createdNotification.closeListener = listener;
        },
        onError: listener => {
          createdNotification.errorListener = listener;
        },
        close: () => {
          if (throwOnClose) {
            throw new Error('notification could not be closed');
          }

          createdNotification.closeCallCount += 1;
        },
      };
    },
  };
};

const createApi = ({
  permission = 'granted',
  ...fakeOptions
}: PlatformFakeOptions & {permission?: SystemNotificationPermission} = {}) => {
  const {createNotification, createdNotifications} = createPlatformFake(fakeOptions);
  const focusWindow = jest.fn();
  const publishNotificationClick = jest.fn();
  const logger = {warn: jest.fn()};

  const api = createSystemNotificationApiFromBrowserNotification({
    createNotification,
    getPermission: () => permission,
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
    const api = createSystemNotificationApiFromBrowserNotification({
      createNotification: createPlatformFake().createNotification,
      getPermission: () => 'granted',
      isSupported: () => false,
      focusWindow: jest.fn(),
      publishNotificationClick: jest.fn(),
      logger: {warn: jest.fn()},
    });

    expect(api.isSupported()).toBe(false);
  });

  it.each(['granted', 'denied', 'default'] as const)('reads the %s permission from the platform', permission => {
    const {api} = createApi({permission});

    expect(api.getPermission()).toBe(permission);
  });

  it('constructs a notification carrying the title, body and tag', () => {
    const {api, createdNotifications} = createApi();

    api.show({...request, onClick: jest.fn(), onClose: jest.fn()});

    expect(createdNotifications).toHaveLength(1);
    expect(createdNotifications.at(0)?.request.title).toBe('Weekly sync');
    expect(createdNotifications.at(0)?.request).toEqual({
      title: 'Weekly sync',
      body: 'Starts at 12:00 PM',
      tag: 'meeting-reminder:tag',
    });
  });

  it('focuses the window and calls back when the notification is clicked', () => {
    const {api, createdNotifications, focusWindow} = createApi();
    const onClick = jest.fn();

    api.show({...request, onClick, onClose: jest.fn()});
    createdNotifications.at(0)?.clickListener?.();

    expect(focusWindow).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('announces the click so the desktop app restores its window and switches account', () => {
    const {api, createdNotifications, publishNotificationClick} = createApi();

    api.show({...request, onClick: jest.fn(), onClose: jest.fn()});
    createdNotifications.at(0)?.clickListener?.();

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
    createdNotifications.at(0)?.closeListener?.();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('logs, closes and calls back when the notification errors after being shown', () => {
    const {api, createdNotifications, logger} = createApi();
    const onClose = jest.fn();

    const errorEvent = new Event('error');

    api.show({...request, onClose});
    createdNotifications.at(0)?.errorListener?.(errorEvent);

    expect(logger.warn).toHaveBeenCalledWith('system notification failed after being shown', {
      tag: 'meeting-reminder:tag',
      event: errorEvent,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(createdNotifications.at(0)?.closeCallCount).toBe(1);
  });

  it('reports a close once even though the platform also fires its close event', () => {
    const {api, createdNotifications} = createApi();
    const onClose = jest.fn();

    const handle = api.show({...request, onClose});

    assert(result.isOk(handle));
    handle.value.close();
    createdNotifications.at(0)?.closeListener?.();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not report a close that failed', () => {
    const {api} = createApi({throwOnClose: true});
    const onClose = jest.fn();

    const handle = api.show({...request, onClose});

    assert(result.isOk(handle));
    expect(result.isErr(handle.value.close())).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the notification open and logs when closing it after an error fails', () => {
    const {api, createdNotifications, logger} = createApi({throwOnClose: true});
    const onClose = jest.fn();

    api.show({...request, onClose});
    createdNotifications.at(0)?.errorListener?.(new Event('error'));

    expect(logger.warn).toHaveBeenCalledWith('failed to close a system notification that errored', {
      error: systemNotificationErrorKinds.closeFailed,
      cause: new Error('notification could not be closed'),
      tag: 'meeting-reminder:tag',
    });
    expect(onClose).not.toHaveBeenCalled();
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
