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

import {APIClient} from '@wireapp/api-client';
import {Notification} from '@wireapp/api-client/dist/commonjs/notification';
import {MemoryEngine} from '@wireapp/store-engine';
import {CryptographyService} from '../cryptography';
import {NotificationService} from './NotificationService';

const BASE_URL = 'mock-backend.wire.com';
const MOCK_BACKEND = {
  name: 'mock',
  rest: `https://${BASE_URL}`,
  ws: `wss://${BASE_URL}`,
};

describe('NotificationService', () => {
  describe('handleEvent', () => {
    it('propagates errors to the outer calling function', async done => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('NotificationService.test');

      const apiClient = new APIClient({store: storeEngine, urls: MOCK_BACKEND});

      const cryptographyService = ({} as unknown) as CryptographyService;
      const notificationService = new NotificationService(apiClient, cryptographyService);

      spyOn<any>(notificationService, 'handleEvent').and.throwError('Test error');

      notificationService.on('error', error => {
        expect(error.message).toBe('Test error');
        done();
      });

      const notification = ({
        payload: [{}],
      } as unknown) as Notification;

      await notificationService.handleNotification(notification);
    });
  });

  describe('handleNotification', () => {
    it('updates last notification ID when notification is NOT transient', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('NotificationService.test');

      const apiClient = new APIClient({store: storeEngine, urls: MOCK_BACKEND});
      const notificationService = new NotificationService(apiClient, ({} as unknown) as CryptographyService);

      spyOn<any>(notificationService, 'handleEvent').and.returnValue({});
      const spySetLastNotificationId = spyOn<any>(notificationService, 'setLastNotificationId').and.returnValue({});

      const notification = ({
        payload: [{}],
        transient: false,
      } as unknown) as Notification;

      await notificationService.handleNotification(notification);

      expect(spySetLastNotificationId.calls.count()).toBe(1);
    });

    it('does NOT update last notification ID when notification is transient', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('NotificationService.test');

      const apiClient = new APIClient({store: storeEngine, urls: MOCK_BACKEND});
      const notificationService = new NotificationService(apiClient, ({} as unknown) as CryptographyService);

      spyOn<any>(notificationService, 'handleEvent').and.returnValue({});
      const spySetLastNotificationId = spyOn<any>(notificationService, 'setLastNotificationId').and.returnValue({});

      const notification = ({
        payload: [{}],
        transient: true,
      } as unknown) as Notification;

      await notificationService.handleNotification(notification);

      expect(spySetLastNotificationId.calls.count()).toBe(0);
    });

    it('does NOT update last notification ID when event processing fails', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('NotificationService.test');

      const apiClient = new APIClient({store: storeEngine, urls: MOCK_BACKEND});
      const notificationService = new NotificationService(apiClient, ({} as unknown) as CryptographyService);

      spyOn<any>(notificationService, 'handleEvent').and.throwError('Test error');
      const spySetLastNotificationId = spyOn<any>(notificationService, 'setLastNotificationId').and.returnValue({});

      const notification = ({
        payload: [{}],
        transient: true,
      } as unknown) as Notification;

      try {
        await notificationService.handleNotification(notification);
        fail('handleNotification should fail');
      } catch (error) {
        expect(error.message).toBe('Test error');
        expect(spySetLastNotificationId.calls.count()).toBe(0);
      }
    });
  });
});
