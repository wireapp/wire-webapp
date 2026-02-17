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

import {Notification} from '@wireapp/api-client/lib/notification';

import {APIClient} from '@wireapp/api-client';
import {MemoryEngine} from '@wireapp/store-engine';

import {ConversationService} from '../conversation';

import {NotificationService, NotificationSource} from '.';

const BASE_URL = 'mock-backend.wire.com';
const MOCK_BACKEND = {
  name: 'mock',
  rest: `https://${BASE_URL}`,
  ws: `wss://${BASE_URL}`,
};

const mockedConversationService = {} as unknown as ConversationService;

const apiClients: APIClient[] = [];

describe('NotificationService', () => {
  afterAll(() => {
    apiClients.forEach(client => client.disconnect());
  });

  describe('handleEvent', () => {
    it('propagates errors to the outer calling function', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('NotificationService.test');

      const apiClient = new APIClient({urls: MOCK_BACKEND});
      apiClients.push(apiClient);

      const notificationService = new NotificationService(apiClient, storeEngine, mockedConversationService);

      jest.spyOn(notificationService as any, 'handleEvent').mockImplementation(() => {
        throw new Error('Test error');
      });

      const promise = new Promise<void>(resolve => {
        notificationService.on(NotificationService.TOPIC.NOTIFICATION_ERROR, notificationError => {
          expect(notificationError.error.message).toBe('Test error');
          resolve();
        });
      });

      const notification = {
        payload: [{}],
      } as unknown as Notification;

      const handledNotifications = notificationService.handleNotification(
        notification,
        NotificationSource.NOTIFICATION_STREAM,
      );
      await handledNotifications.next();

      return promise;
    });
  });

  describe('handleNotification', () => {
    it('updates last notification ID when notification is NOT transient', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('NotificationService.test');

      const apiClient = new APIClient({urls: MOCK_BACKEND});
      apiClients.push(apiClient);
      const notificationService = new NotificationService(apiClient, storeEngine, mockedConversationService);

      jest.spyOn(notificationService as any, 'handleEvent').mockReturnValue({});
      const spySetLastNotificationId = jest
        .spyOn(notificationService as any, 'setLastNotificationId')
        .mockReturnValue({});

      const notification = {
        payload: [{}],
        transient: false,
      } as unknown as Notification;

      const handledNotifications = notificationService.handleNotification(
        notification,
        NotificationSource.NOTIFICATION_STREAM,
      );

      await handledNotifications.next();
      await handledNotifications.next();

      expect(spySetLastNotificationId).toHaveBeenCalledTimes(1);
    });

    it('does NOT update last notification ID when notification is transient', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('NotificationService.test');

      const apiClient = new APIClient({urls: MOCK_BACKEND});
      apiClients.push(apiClient);
      const notificationService = new NotificationService(apiClient, storeEngine, mockedConversationService);

      jest.spyOn(notificationService as any, 'handleEvent').mockReturnValue({});
      const spySetLastNotificationId = jest
        .spyOn(notificationService as any, 'setLastNotificationId')
        .mockReturnValue({});

      const notification = {
        payload: [{}],
        transient: true,
      } as unknown as Notification;

      const handledNotifications = notificationService.handleNotification(
        notification,
        NotificationSource.NOTIFICATION_STREAM,
      );
      await handledNotifications.next();

      expect(spySetLastNotificationId).toHaveBeenCalledTimes(0);
    });

    it('does NOT update last notification ID when event processing fails', async () => {
      return new Promise<void>(async resolve => {
        const storeEngine = new MemoryEngine();
        await storeEngine.init('NotificationService.test');

        const apiClient = new APIClient({urls: MOCK_BACKEND});
        apiClients.push(apiClient);
        const notificationService = new NotificationService(apiClient, storeEngine, mockedConversationService);
        notificationService.on(NotificationService.TOPIC.NOTIFICATION_ERROR, notificationError => {
          expect(notificationError.error.message).toBe('Test error');
          expect(spySetLastNotificationId).toHaveBeenCalledTimes(0);
          resolve();
        });

        jest.spyOn(notificationService as any, 'handleEvent').mockImplementation(() => {
          throw new Error('Test error');
        });
        const spySetLastNotificationId = jest
          .spyOn(notificationService as any, 'setLastNotificationId')
          .mockResolvedValue('');

        const notification = {
          payload: [{}],
          transient: true,
        } as unknown as Notification;

        const handledNotifications = notificationService.handleNotification(
          notification,
          NotificationSource.NOTIFICATION_STREAM,
        );
        await handledNotifications.next();
      });
    });
  });
});
