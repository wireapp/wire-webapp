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

import {BackendEvent, CONVERSATION_EVENT, USER_EVENT} from '@wireapp/api-client/lib/event/';

import {ConnectionState} from '@wireapp/core';

import {ClientConversationEvent} from 'Repositories/conversation/EventBuilder';

import {ClientEvent} from './Client';
import {EventRepository} from './EventRepository';
import {EventSource} from './EventSource';
import {NOTIFICATION_HANDLING_STATE} from './NotificationHandlingState';
import {EventValidationError} from './preprocessor/EventStorageMiddleware/eventHandlers/EventValidationError';

import {TestFactory} from '../../../../test/helper/TestFactory';

const testFactory = new TestFactory();

describe('EventRepository', () => {
  beforeAll(() => testFactory.exposeClientActors());

  beforeEach(() => {
    return testFactory.exposeEventActors();
  });

  describe('handleEvent', () => {
    beforeEach(() => {
      testFactory.event_repository!.notificationHandlingState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      spyOn<any>(testFactory.event_repository!, 'distributeEvent');
    });

    describe('event type handling', () => {
      it('should not save but distribute "user.*" events', () => {
        return testFactory
          .event_repository![
            'handleEvent'
          ]({event: {type: USER_EVENT.UPDATE, user: {id: ''}}}, EventSource.NOTIFICATION_STREAM)
          .then(() => {
            expect(testFactory.event_repository!['distributeEvent']).toHaveBeenCalled();
          });
      });

      it('should not save but distribute "call.*" events', () => {
        return testFactory
          .event_repository![
            'handleEvent'
          ]({event: {type: ClientEvent.CALL.E_CALL} as any}, EventSource.NOTIFICATION_STREAM)
          .then(() => {
            expect(testFactory.event_repository!['distributeEvent']).toHaveBeenCalled();
          });
      });

      it('should not save but distribute "conversation.create" events', () => {
        return testFactory
          .event_repository![
            'handleEvent'
          ]({event: {type: CONVERSATION_EVENT.CREATE} as any}, EventSource.NOTIFICATION_STREAM)
          .then(() => {
            expect(testFactory.event_repository!['distributeEvent']).toHaveBeenCalled();
          });
      });
    });

    describe('conversation events', () => {
      it('accepts "conversation.rename" events', () => {
        const event = {
          conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
          data: {name: 'Renamed'},
          from: '532af01e-1e24-4366-aacf-33b67d4ee376',
          id: '7.800122000b2f7cca',
          time: '2016-08-09T11:57:37.498Z',
          type: 'conversation.rename',
        } as BackendEvent;

        return testFactory.event_repository!['handleEvent']({event}, EventSource.NOTIFICATION_STREAM).then(() => {
          expect(testFactory.event_repository!['distributeEvent']).toHaveBeenCalled();
        });
      });

      it('accepts "conversation.member-join" events', () => {
        const event = {
          conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
          data: {user_ids: ['e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86']},
          from: '532af01e-1e24-4366-aacf-33b67d4ee376',
          id: '8.800122000b2f7d20',
          time: '2016-08-09T12:01:14.688Z',
          type: 'conversation.member-join',
        } as BackendEvent;

        return testFactory.event_repository!['handleEvent']({event}, EventSource.NOTIFICATION_STREAM).then(() => {
          expect(testFactory.event_repository!['distributeEvent']).toHaveBeenCalled();
        });
      });

      it('accepts "conversation.member-leave" events', () => {
        const event = {
          conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
          data: {user_ids: ['e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86'], qualified_user_ids: []},
          from: '532af01e-1e24-4366-aacf-33b67d4ee376',
          id: '9.800122000b3d69bc',
          time: '2016-08-09T12:01:56.363Z',
          type: 'conversation.member-leave',
        } as BackendEvent;

        return testFactory.event_repository!['handleEvent']({event}, EventSource.NOTIFICATION_STREAM).then(() => {
          expect(testFactory.event_repository!['distributeEvent']).toHaveBeenCalled();
        });
      });

      it('accepts "conversation.voice-channel-deactivate" (missed call) events', async () => {
        const fakeProp: any = undefined;
        const eventRepo = new EventRepository({} as any, fakeProp, fakeProp, fakeProp);
        eventRepo.notificationHandlingState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
        jest.spyOn<any, any>(eventRepo, 'distributeEvent').mockImplementation(() => {});

        const event = {
          conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
          data: {reason: 'missed', duration: 0},
          from: '0410795a-58dc-40d8-b216-cbc2360be21a',
          id: '16.800122000b3d4ade',
          time: '2016-08-09T12:09:28.294Z',
          type: 'conversation.voice-channel-deactivate',
        } as any;

        await eventRepo['handleEvent']({event}, EventSource.NOTIFICATION_STREAM);

        expect(eventRepo['distributeEvent']).toHaveBeenCalled();
      });
    });

    describe('decryption errors', () => {
      it('accepts plain decryption error events', () => {
        const event = {
          conversation: '7f0939c8-dbd9-48f5-839e-b0ebcfffec8c',
          error: 'Offset is outside the bounds of the DataView (17cd13b4b2a3a98)',
          error_code: '1778 (17cd13b4b2a3a98)',
          from: '532af01e-1e24-4366-aacf-33b67d4ee376',
          id: 'f518d6ff-19d3-48a0-b0c1-cc71c6e81136',
          time: '2016-08-09T12:58:49.485Z',
          type: 'conversation.unable-to-decrypt',
        } as ClientConversationEvent;

        return testFactory.event_repository!.injectEvent(event).then(() => {
          expect(testFactory.event_repository!['distributeEvent']).toHaveBeenCalled();
        });
      });
    });
  });

  describe('injectEvent', () => {
    describe('validation', () => {
      it('should throw an error if no event is provided', async () => {
        await expect(testFactory.event_repository!.injectEvent(null as any)).rejects.toThrow();
      });

      it('should not inject events into self conversation', async () => {
        const selfUserId = testFactory.event_repository!['userState'].self()?.id;
        const event = {
          conversation: selfUserId,
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          from: 'user-id',
          time: new Date().toISOString(),
        } as any;

        jest.spyOn<any, any>(testFactory.event_repository!, 'processEvent');
        await testFactory.event_repository!.injectEvent(event);

        expect(testFactory.event_repository!['processEvent']).not.toHaveBeenCalled();
      });
    });

    describe('event source handling', () => {
      it('should inject event with correct source when not handling websocket', async () => {
        testFactory.event_repository!.notificationHandlingState(NOTIFICATION_HANDLING_STATE.STREAM);
        const event = {
          conversation: 'conv-id',
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          from: 'user-id',
          time: new Date().toISOString(),
        } as any;

        jest.spyOn<any, any>(testFactory.event_repository!, 'processEvent');
        await testFactory.event_repository!.injectEvent(event, EventSource.WEBSOCKET);

        expect(testFactory.event_repository!['processEvent']).toHaveBeenCalledWith(event, EventSource.INJECTED);
      });
    });
  });

  describe('configuration', () => {
    describe('setEventProcessMiddlewares', () => {
      it('should set event process middlewares', () => {
        const middlewares = [{processEvent: jest.fn()}, {processEvent: jest.fn()}] as any;

        testFactory.event_repository!.setEventProcessMiddlewares(middlewares);
        expect(testFactory.event_repository!['eventProcessMiddlewares']).toEqual(middlewares);
      });
    });

    describe('setEventProcessors', () => {
      it('should set event processors', () => {
        const processors = [{processEvent: jest.fn()}, {processEvent: jest.fn()}] as any;

        testFactory.event_repository!.setEventProcessors(processors);
        expect(testFactory.event_repository!['eventProcessors']).toEqual(processors);
      });
    });
  });

  describe('processEvent', () => {
    describe('middleware execution', () => {
      it('should run all middlewares sequentially', async () => {
        const callOrder: number[] = [];
        const middleware1 = {
          processEvent: jest.fn(async (event: any) => {
            callOrder.push(1);
            return event;
          }),
        };
        const middleware2 = {
          processEvent: jest.fn(async (event: any) => {
            callOrder.push(2);
            return event;
          }),
        };

        testFactory.event_repository!.setEventProcessMiddlewares([middleware1, middleware2] as any);
        jest.spyOn<any, any>(testFactory.event_repository!, 'handleEventDistribution').mockResolvedValue(undefined);

        const event = {
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          conversation: 'conv-id',
          from: 'user-id',
          time: new Date().toISOString(),
        } as any;

        await testFactory.event_repository!['processEvent'](event, EventSource.WEBSOCKET);

        expect(callOrder).toEqual([1, 2]);
        expect(middleware1.processEvent).toHaveBeenCalled();
        expect(middleware2.processEvent).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should stop processing if middleware throws EventValidationError', async () => {
        const middleware = {
          processEvent: jest.fn().mockRejectedValue(new EventValidationError('Validation failed')),
        };

        testFactory.event_repository!.setEventProcessMiddlewares([middleware] as any);
        jest.spyOn<any, any>(testFactory.event_repository!, 'handleEventDistribution');

        const event = {
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          conversation: 'conv-id',
          from: 'user-id',
          time: new Date().toISOString(),
        } as any;

        await testFactory.event_repository!['processEvent'](event, EventSource.WEBSOCKET);

        expect(middleware.processEvent).toHaveBeenCalled();
        expect(testFactory.event_repository!['handleEventDistribution']).not.toHaveBeenCalled();
      });

      it('should rethrow non-EventValidationError errors', async () => {
        const middleware = {
          processEvent: jest.fn().mockRejectedValue(new Error('Some other error')),
        };

        testFactory.event_repository!.setEventProcessMiddlewares([middleware] as any);

        const event = {
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          conversation: 'conv-id',
          from: 'user-id',
          time: new Date().toISOString(),
        } as any;

        await expect(testFactory.event_repository!['processEvent'](event, EventSource.WEBSOCKET)).rejects.toThrow(
          'Some other error',
        );
      });
    });
  });

  describe('getIsoDateFromEvent', () => {
    describe('extracting time from events', () => {
      it('should return time field if present', () => {
        const event = {
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          time: '2023-01-01T12:00:00.000Z',
        } as any;

        const result = testFactory.event_repository!['getIsoDateFromEvent'](event);
        expect(result).toBe('2023-01-01T12:00:00.000Z');
      });

      it('should return client.time for CLIENT_ADD event', () => {
        const event = {
          type: USER_EVENT.CLIENT_ADD,
          client: {
            time: '2023-01-01T12:00:00.000Z',
          },
        } as any;

        const result = testFactory.event_repository!['getIsoDateFromEvent'](event);
        expect(result).toBe('2023-01-01T12:00:00.000Z');
      });

      it('should return connection.last_update for CONNECTION event', () => {
        const event = {
          type: USER_EVENT.CONNECTION,
          connection: {
            last_update: '2023-01-01T12:00:00.000Z',
          },
        } as any;

        const result = testFactory.event_repository!['getIsoDateFromEvent'](event);
        expect(result).toBe('2023-01-01T12:00:00.000Z');
      });
    });

    describe('fallback behavior', () => {
      it('should return epoch date if defaultValue is true and no time found', () => {
        const event = {
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
        } as any;

        const result = testFactory.event_repository!['getIsoDateFromEvent'](event, true);
        expect(result).toBe(new Date(0).toISOString());
      });

      it('should return undefined if defaultValue is false and no time found', () => {
        const event = {
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
        } as any;

        const result = testFactory.event_repository!['getIsoDateFromEvent'](event, false);
        expect(result).toBeUndefined();
      });
    });
  });

  describe('updateLastEventDate', () => {
    it('should update last event date if new date is greater', async () => {
      const oldDate = '2023-01-01T12:00:00.000Z';
      const newDate = '2023-01-02T12:00:00.000Z';

      testFactory.event_repository!['lastEventDate'](oldDate);
      jest
        .spyOn(testFactory.event_repository!['notificationService'], 'saveLastEventDateToDb')
        .mockResolvedValue(newDate);

      await testFactory.event_repository!['updateLastEventDate'](newDate);

      expect(testFactory.event_repository!['lastEventDate']()).toBe(newDate);
      expect(testFactory.event_repository!['notificationService'].saveLastEventDateToDb).toHaveBeenCalledWith(newDate);
    });

    it('should not update last event date if new date is not greater', async () => {
      const oldDate = '2023-01-02T12:00:00.000Z';
      const newDate = '2023-01-01T12:00:00.000Z';

      testFactory.event_repository!['lastEventDate'](oldDate);
      jest.spyOn(testFactory.event_repository!['notificationService'], 'saveLastEventDateToDb');

      await testFactory.event_repository!['updateLastEventDate'](newDate);

      expect(testFactory.event_repository!['lastEventDate']()).toBe(oldDate);
      expect(testFactory.event_repository!['notificationService'].saveLastEventDateToDb).not.toHaveBeenCalled();
    });
  });

  describe('distributeEvent', () => {
    describe('processor execution', () => {
      it('should call all event processors in parallel', async () => {
        const processor1 = {processEvent: jest.fn().mockResolvedValue(undefined)};
        const processor2 = {processEvent: jest.fn().mockResolvedValue(undefined)};

        testFactory.event_repository!.setEventProcessors([processor1, processor2] as any);

        const event = {
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          conversation: 'conv-id',
          from: 'user-id',
          time: new Date().toISOString(),
        } as any;

        await testFactory.event_repository!['distributeEvent'](event, EventSource.WEBSOCKET);

        expect(processor1.processEvent).toHaveBeenCalledWith(event, EventSource.WEBSOCKET);
        expect(processor2.processEvent).toHaveBeenCalledWith(event, EventSource.WEBSOCKET);
      });
    });

    describe('error handling', () => {
      it('should throw if a processor fails', async () => {
        const processor1 = {processEvent: jest.fn().mockRejectedValue(new Error('Processor 1 failed'))};
        const processor2 = {processEvent: jest.fn().mockResolvedValue(undefined)};

        testFactory.event_repository!.setEventProcessors([processor1, processor2] as any);

        const event = {
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          conversation: 'conv-id',
          from: 'user-id',
          time: new Date().toISOString(),
        } as any;

        await expect(testFactory.event_repository!['distributeEvent'](event, EventSource.WEBSOCKET)).rejects.toThrow(
          'Processor 1 failed',
        );

        expect(processor1.processEvent).toHaveBeenCalled();
      });
    });
  });

  describe('updateConnectivityStatus', () => {
    describe('notification handling state changes', () => {
      it('should update notification handling state to STREAM when PROCESSING_NOTIFICATIONS', () => {
        testFactory.event_repository!['updateConnectivityStatus'](ConnectionState.PROCESSING_NOTIFICATIONS);

        expect(testFactory.event_repository!.notificationHandlingState()).toBe(NOTIFICATION_HANDLING_STATE.STREAM);
      });

      it('should update notification handling state to WEB_SOCKET when LIVE', () => {
        testFactory.event_repository!['updateConnectivityStatus'](ConnectionState.LIVE);

        expect(testFactory.event_repository!.notificationHandlingState()).toBe(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      });
    });
  });

  describe('mapEncryptedEvent', () => {
    describe('ignored decryption errors', () => {
      it('should return undefined for ignored decryption error codes', async () => {
        const event = {
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          conversation: 'conv-id',
          from: 'user-id',
          time: new Date().toISOString(),
          data: 'encrypted',
        } as any;

        const decryptionError = {
          name: 'DecryptionError',
          code: 208,
          message: 'Outdated message',
        };

        const result = await testFactory.event_repository!['mapEncryptedEvent'](
          event,
          {decryptionError, decryptedData: undefined},
          EventSource.WEBSOCKET,
        );

        expect(result).toBeUndefined();
      });

      it('should return undefined for duplicate message decryption errors', async () => {
        const event = {
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          conversation: 'conv-id',
          from: 'user-id',
          time: new Date().toISOString(),
          data: 'encrypted',
        } as any;

        const decryptionError = {
          name: 'DecryptionError',
          code: 209,
          message: 'Duplicate message',
        };

        const result = await testFactory.event_repository!['mapEncryptedEvent'](
          event,
          {decryptionError, decryptedData: undefined},
          EventSource.WEBSOCKET,
        );

        expect(result).toBeUndefined();
      });
    });

    describe('non-ignored decryption errors', () => {
      it('should build unable-to-decrypt event for non-ignored decryption errors', async () => {
        const event = {
          type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          conversation: 'conv-id',
          from: 'user-id',
          time: new Date().toISOString(),
          data: 'encrypted',
        } as any;

        const decryptionError = {
          name: 'DecryptionError',
          code: 500,
          message: 'Unknown error',
        };

        const result = await testFactory.event_repository!['mapEncryptedEvent'](
          event,
          {decryptionError, decryptedData: undefined},
          EventSource.WEBSOCKET,
        );

        expect(result).toBeDefined();
        expect(result?.type).toBe('conversation.unable-to-decrypt');
      });
    });
  });

  describe('CONFIG', () => {
    it('should have correct configuration values', () => {
      expect(EventRepository.CONFIG.E_CALL_EVENT_LIFETIME).toBe(30000);
      expect(EventRepository.CONFIG.NOTIFICATION_BATCHES.INITIAL).toBe(500);
      expect(EventRepository.CONFIG.NOTIFICATION_BATCHES.SUBSEQUENT).toBe(5000);
      expect(EventRepository.CONFIG.NOTIFICATION_BATCHES.MAX).toBe(10000);
      expect(EventRepository.CONFIG.IGNORED_ERRORS).toContain('VALIDATION_FAILED');
    });
  });

  describe('connectWebSocket', () => {
    let mockAccount: any;

    beforeEach(() => {
      jest.useFakeTimers();
      mockAccount = {
        listen: jest.fn().mockResolvedValue(jest.fn()),
        isWebsocketHealthy: jest.fn().mockResolvedValue(true),
      };
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    describe('network event handling', () => {
      it('should handle offline event by disconnecting websocket', async () => {
        const mockNotificationService = {getServerTime: jest.fn().mockResolvedValue('2023-01-01T00:00:00.000Z')};
        const eventRepo = new EventRepository(
          {} as any,
          mockNotificationService as any,
          {computeTimeOffset: jest.fn()} as any,
          {} as any,
        );
        const disconnectMock = jest.fn();

        mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
          onConnectionStateChanged(ConnectionState.LIVE);
          return disconnectMock;
        });

        const connectPromise = eventRepo.connectWebSocket(mockAccount, false, jest.fn());

        await connectPromise;

        window.dispatchEvent(new Event('offline'));

        expect(disconnectMock).toHaveBeenCalled();
      });

      it('should handle online event by attempting to reconnect', async () => {
        const mockNotificationService = {getServerTime: jest.fn().mockResolvedValue('2023-01-01T00:00:00.000Z')};
        const eventRepo = new EventRepository(
          {} as any,
          mockNotificationService as any,
          {computeTimeOffset: jest.fn()} as any,
          {} as any,
        );
        let listenCallCount = 0;

        mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
          listenCallCount++;
          onConnectionStateChanged(ConnectionState.LIVE);
          return jest.fn();
        });

        await eventRepo.connectWebSocket(mockAccount, false, jest.fn());

        expect(listenCallCount).toBe(1);

        window.dispatchEvent(new Event('online'));

        await jest.runOnlyPendingTimersAsync();

        expect(listenCallCount).toBeGreaterThan(1);
      });
    });

    describe('health monitoring', () => {
      it('should periodically check websocket health and reconnect if unhealthy', async () => {
        const mockNotificationService = {getServerTime: jest.fn().mockResolvedValue('2023-01-01T00:00:00.000Z')};
        const eventRepo = new EventRepository(
          {} as any,
          mockNotificationService as any,
          {computeTimeOffset: jest.fn()} as any,
          {} as any,
        );
        let listenCallCount = 0;

        mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
          listenCallCount++;
          onConnectionStateChanged(ConnectionState.LIVE);
          return jest.fn();
        });

        mockAccount.isWebsocketHealthy = jest
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false)
          .mockResolvedValue(true);

        await eventRepo.connectWebSocket(mockAccount, false, jest.fn());

        expect(listenCallCount).toBe(1);

        await jest.advanceTimersByTimeAsync(60000);

        expect(mockAccount.isWebsocketHealthy).toHaveBeenCalledTimes(1);

        await jest.advanceTimersByTimeAsync(60000);

        expect(listenCallCount).toBeGreaterThan(1);
      });
    });

    describe('connection retry', () => {
      it('should retry connection on failure', async () => {
        const mockNotificationService = {getServerTime: jest.fn().mockResolvedValue('2023-01-01T00:00:00.000Z')};
        const eventRepo = new EventRepository(
          {} as any,
          mockNotificationService as any,
          {computeTimeOffset: jest.fn()} as any,
          {} as any,
        );
        let attemptCount = 0;

        mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
          attemptCount++;
          if (attemptCount === 1) {
            throw new Error('Connection failed');
          }
          onConnectionStateChanged(ConnectionState.LIVE);
          return jest.fn();
        });

        const connectPromise = eventRepo.connectWebSocket(mockAccount, false, jest.fn());

        await expect(connectPromise).rejects.toThrow('Connection failed');

        await jest.advanceTimersByTimeAsync(5000);

        expect(attemptCount).toBeGreaterThan(1);
      });

      it('should reject and retry if connection moves to CLOSED state', async () => {
        const mockNotificationService = {getServerTime: jest.fn().mockResolvedValue('2023-01-01T00:00:00.000Z')};
        const eventRepo = new EventRepository(
          {} as any,
          mockNotificationService as any,
          {computeTimeOffset: jest.fn()} as any,
          {} as any,
        );
        let attemptCount = 0;

        mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
          attemptCount++;
          if (attemptCount === 1) {
            onConnectionStateChanged(ConnectionState.CLOSED);
          } else {
            onConnectionStateChanged(ConnectionState.LIVE);
          }
          return jest.fn();
        });

        const connectPromise = eventRepo.connectWebSocket(mockAccount, false, jest.fn());

        await expect(connectPromise).rejects.toThrow('WebSocket connection closed');

        await jest.advanceTimersByTimeAsync(5000);

        expect(attemptCount).toBeGreaterThan(1);
      });

      it('should timeout if connection does not reach LIVE state', async () => {
        const mockNotificationService = {getServerTime: jest.fn().mockResolvedValue('2023-01-01T00:00:00.000Z')};
        const eventRepo = new EventRepository(
          {} as any,
          mockNotificationService as any,
          {computeTimeOffset: jest.fn()} as any,
          {} as any,
        );

        mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
          // Stay in CONNECTING state indefinitely
          onConnectionStateChanged(ConnectionState.CONNECTING);
          return jest.fn();
        });

        const connectPromise = eventRepo.connectWebSocket(mockAccount, false, jest.fn());

        // Prevent unhandled rejection error during timer advancement
        const catchUnhandled = connectPromise.catch(() => {});

        // Advance past the 30 second timeout
        await jest.advanceTimersByTimeAsync(30000);

        // Wait for the catch handler to process
        await catchUnhandled;

        // The promise should have already rejected by now
        await expect(connectPromise).rejects.toThrow('WebSocket connection timeout');
      });
    });

    describe('cleanup', () => {
      it('should not clean up event listeners when disconnect is called', async () => {
        const mockNotificationService = {getServerTime: jest.fn().mockResolvedValue('2023-01-01T00:00:00.000Z')};
        const eventRepo = new EventRepository(
          {} as any,
          mockNotificationService as any,
          {computeTimeOffset: jest.fn()} as any,
          {} as any,
        );

        mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
          onConnectionStateChanged(ConnectionState.LIVE);
          return jest.fn();
        });
        const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
        const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

        await eventRepo.connectWebSocket(mockAccount, false, jest.fn());

        eventRepo.disconnectWebSocket();

        // Event listeners should remain active to detect when connectivity returns
        expect(removeEventListenerSpy).not.toHaveBeenCalledWith('online', expect.any(Function));
        expect(removeEventListenerSpy).not.toHaveBeenCalledWith('offline', expect.any(Function));
        // Heartbeat should continue running
        expect(clearIntervalSpy).not.toHaveBeenCalled();
      });
    });
  });
});
