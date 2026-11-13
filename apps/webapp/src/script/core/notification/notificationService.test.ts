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

import {nodePlatform} from '../../apiClient/shims/node/platform';

import {Notification} from '../../apiClient/notification/notification';

import {APIClient} from '../../apiClient/apiClient';
import {BackendEvent} from '../../apiClient/event/backendEvent';
import {CONVERSATION_EVENT} from '../../apiClient/event/conversationEvent';
import {MemoryEngine} from '../storage/engine/memoryEngine';

import {ConversationService} from '../conversation';

import {HandledEventPayload, HandledEventResult, NotificationService, NotificationSource} from '.';

const BASE_URL = 'mock-backend.wire.com';
const MOCK_BACKEND = {
  name: 'mock',
  rest: `https://${BASE_URL}`,
  ws: `wss://${BASE_URL}`,
};

const mockedConversationService = {} as unknown as ConversationService;

const apiClients: APIClient[] = [];

describe('NotificationService', () => {
  afterEach(() => {
    apiClients.forEach(client => {
      client.dispose();
    });
    apiClients.length = 0;
  });

  describe('handleEvent', () => {
    it('propagates errors to the outer calling function', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('NotificationService.test');

      const apiClient = new APIClient({platform: nodePlatform, urls: MOCK_BACKEND});
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
    it.each([NotificationSource.NOTIFICATION_STREAM, NotificationSource.WEBSOCKET])(
      'drops only targeted MLS events, acknowledges notifications and can resume (%s)',
      async source => {
        const storeEngine = new MemoryEngine();
        await storeEngine.init('NotificationService.test');
        const apiClient = new APIClient({platform: nodePlatform, urls: MOCK_BACKEND});
        apiClients.push(apiClient);
        const handleEvent = jest.fn(async (event: BackendEvent): Promise<HandledEventResult> => {
          return {status: 'handled', payload: {event}};
        });
        const conversationService = {handleEvent} as unknown as ConversationService;
        const service = new NotificationService(apiClient, storeEngine, conversationService);
        const target = {id: 'conversation-id', domain: 'example.com'};
        const message = {
          type: CONVERSATION_EVENT.MLS_MESSAGE_ADD,
          conversation: target.id,
          qualified_conversation: target,
        } as BackendEvent;
        const process = async (id: string, payload: BackendEvent[]): Promise<HandledEventPayload[]> => {
          const results: HandledEventPayload[] = [];
          for await (const result of service.handleNotification({id, payload}, source)) {
            results.push(result);
          }
          return results;
        };

        await expect(process('before', [message])).resolves.toEqual([{event: message}]);
        handleEvent.mockClear();
        service.setIgnoredMLSConversation(target);
        const droppedEvents = [
          message,
          {...message, type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE},
          {...message, qualified_conversation: undefined},
        ] as BackendEvent[];
        await expect(process('dropped', droppedEvents)).resolves.toEqual([]);
        expect(handleEvent).not.toHaveBeenCalled();
        await expect(storeEngine.read('amplify', 'z.storage.StorageKey.NOTIFICATION.LAST_ID')).resolves.toEqual({
          value: 'dropped',
        });

        const unaffectedEvents = [
          {...message, qualified_conversation: {...target, domain: 'other.example.com'}},
          {...message, conversation: 'another-conversation', qualified_conversation: undefined},
          {...message, type: CONVERSATION_EVENT.OTR_MESSAGE_ADD},
        ] as BackendEvent[];
        await expect(process('unaffected', unaffectedEvents)).resolves.toEqual(
          unaffectedEvents.map(event => {
            return {event};
          }),
        );

        service.setIgnoredMLSConversation();
        await expect(process('resumed', [message])).resolves.toEqual([{event: message}]);
      },
    );

    it('continues to yield a single handled payload', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('NotificationService.test');

      const apiClient = new APIClient({platform: nodePlatform, urls: MOCK_BACKEND});
      apiClients.push(apiClient);
      const notificationService = new NotificationService(apiClient, storeEngine, mockedConversationService);
      const payload = {event: {type: 'single'}} as unknown as HandledEventPayload;

      const serviceWithHandleEvent = notificationService as unknown as {
        handleEvent: () => Promise<HandledEventResult>;
      };
      jest.spyOn(serviceWithHandleEvent, 'handleEvent').mockResolvedValue({status: 'handled', payload});

      const notification = {payload: [{}], transient: true} as unknown as Notification;
      const handledNotifications = notificationService.handleNotification(
        notification,
        NotificationSource.NOTIFICATION_STREAM,
      );

      await expect(handledNotifications.next()).resolves.toEqual({done: false, value: payload});
      await expect(handledNotifications.next()).resolves.toEqual({done: true, value: undefined});
    });

    it('yields multiple handled payloads in their original order', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('NotificationService.test');

      const apiClient = new APIClient({platform: nodePlatform, urls: MOCK_BACKEND});
      apiClients.push(apiClient);
      const notificationService = new NotificationService(apiClient, storeEngine, mockedConversationService);
      const firstPayload = {event: {type: 'first'}} as unknown as HandledEventPayload;
      const secondPayload = {event: {type: 'second'}} as unknown as HandledEventPayload;

      const serviceWithHandleEvent = notificationService as unknown as {
        handleEvent: () => Promise<HandledEventResult>;
      };
      jest.spyOn(serviceWithHandleEvent, 'handleEvent').mockResolvedValue({
        status: 'handled',
        payload: [firstPayload, secondPayload],
      });

      const notification = {payload: [{}], transient: true} as unknown as Notification;
      const handledNotifications = notificationService.handleNotification(
        notification,
        NotificationSource.NOTIFICATION_STREAM,
      );

      await expect(handledNotifications.next()).resolves.toEqual({done: false, value: firstPayload});
      await expect(handledNotifications.next()).resolves.toEqual({done: false, value: secondPayload});
      await expect(handledNotifications.next()).resolves.toEqual({done: true, value: undefined});
    });

    it('updates last notification ID when notification is NOT transient', async () => {
      const storeEngine = new MemoryEngine();
      await storeEngine.init('NotificationService.test');

      const apiClient = new APIClient({platform: nodePlatform, urls: MOCK_BACKEND});
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

      const apiClient = new APIClient({platform: nodePlatform, urls: MOCK_BACKEND});
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

        const apiClient = new APIClient({platform: nodePlatform, urls: MOCK_BACKEND});
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
