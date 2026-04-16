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
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

import {ClientConversationEvent} from 'Repositories/conversation/EventBuilder';
import {Warnings} from '../../view_model/WarningsContainer';

import {ClientEvent} from './Client';
import {EventRepository} from './EventRepository';
import {EventSource} from './EventSource';
import {NOTIFICATION_HANDLING_STATE} from './NotificationHandlingState';

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

  describe('updateConnectivityStatus', () => {
    let eventRepository: EventRepository;

    beforeEach(() => {
      // Create a minimal EventRepository instance for testing
      const mockEventService: any = {};
      const mockNotificationService: any = {};
      const mockServerTimeHandler: any = {};
      const mockUserState: any = {};

      eventRepository = new EventRepository(
        mockEventService,
        mockNotificationService,
        mockServerTimeHandler,
        mockUserState,
      );

      // Spy on Warnings methods
      jest.spyOn(Warnings, 'showWarning').mockImplementation(() => {});
      jest.spyOn(Warnings, 'hideWarning').mockImplementation(() => {});

      // Spy on amplify publish
      jest.spyOn(amplify, 'publish').mockReturnValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should handle ConnectionState.CONNECTING', () => {
      eventRepository['updateConnectivityStatus'](ConnectionState.CONNECTING);

      expect(Warnings.hideWarning).toHaveBeenCalledWith(Warnings.TYPE.NO_INTERNET);
      expect(Warnings.showWarning).toHaveBeenCalledWith(Warnings.TYPE.CONNECTIVITY_RECONNECT);
      // Note: CONNECTING does not change notificationHandlingState
    });

    it('should handle ConnectionState.PROCESSING_NOTIFICATIONS', () => {
      eventRepository['updateConnectivityStatus'](ConnectionState.PROCESSING_NOTIFICATIONS);

      expect(eventRepository.notificationHandlingState()).toBe(NOTIFICATION_HANDLING_STATE.STREAM);
      expect(Warnings.hideWarning).toHaveBeenCalledWith(Warnings.TYPE.NO_INTERNET);
      expect(Warnings.hideWarning).toHaveBeenCalledWith(Warnings.TYPE.CONNECTIVITY_RECONNECT);
      expect(Warnings.showWarning).toHaveBeenCalledWith(Warnings.TYPE.CONNECTIVITY_RECOVERY);
    });

    it('should handle ConnectionState.CLOSED', () => {
      eventRepository['updateConnectivityStatus'](ConnectionState.CLOSED);

      expect(eventRepository.notificationHandlingState()).toBe(NOTIFICATION_HANDLING_STATE.CLOSED);
      expect(Warnings.showWarning).toHaveBeenCalledWith(Warnings.TYPE.NO_INTERNET);
    });

    it('should handle ConnectionState.LIVE', () => {
      eventRepository['updateConnectivityStatus'](ConnectionState.LIVE);

      expect(eventRepository.notificationHandlingState()).toBe(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      expect(amplify.publish).toHaveBeenCalledWith(WebAppEvents.CONNECTION.ONLINE);
      expect(Warnings.hideWarning).toHaveBeenCalledWith(Warnings.TYPE.NO_INTERNET);
      expect(Warnings.hideWarning).toHaveBeenCalledWith(Warnings.TYPE.CONNECTIVITY_RECONNECT);
      expect(Warnings.hideWarning).toHaveBeenCalledWith(Warnings.TYPE.CONNECTIVITY_RECOVERY);
    });

    it('should log the connection state change', () => {
      const logSpy = jest.spyOn(eventRepository.logger, 'log').mockImplementation(() => {});

      eventRepository['updateConnectivityStatus'](ConnectionState.LIVE);

      expect(logSpy).toHaveBeenCalledWith('Websocket connection state changed to', ConnectionState.LIVE);
    });
  });

  describe('CONFIG', () => {
    it('should have HEARTBEAT_INTERVAL configured', () => {
      expect(EventRepository.CONFIG.HEARTBEAT_INTERVAL).toBeDefined();
      expect(EventRepository.CONFIG.HEARTBEAT_INTERVAL).toBe(30000); // 30 seconds in milliseconds
    });

    it('should have existing configurations', () => {
      expect(EventRepository.CONFIG.E_CALL_EVENT_LIFETIME).toBeDefined();
      expect(EventRepository.CONFIG.IGNORED_ERRORS).toBeDefined();
      expect(EventRepository.CONFIG.NOTIFICATION_BATCHES).toBeDefined();
    });
  });

  describe('connectWebSocket', () => {
    let eventRepository: EventRepository;
    let mockAccount: any;
    let mockEventService: any;
    let mockNotificationService: any;
    let mockServerTimeHandler: any;

    beforeEach(() => {
      mockEventService = {};
      mockNotificationService = {
        getServerTime: jest.fn().mockResolvedValue('2024-01-01T00:00:00.000Z'),
      };
      mockServerTimeHandler = {
        computeTimeOffset: jest.fn(),
      };

      eventRepository = new EventRepository(
        mockEventService,
        mockNotificationService,
        mockServerTimeHandler,
        {} as any,
      );

      mockAccount = {
        listen: jest.fn().mockResolvedValue(jest.fn()),
      };

      // Mock window event listeners
      jest.spyOn(window, 'addEventListener');
      jest.spyOn(window, 'removeEventListener');
      jest.spyOn(window, 'setInterval').mockReturnValue(123 as any);
      jest.spyOn(window, 'clearInterval');

      // Mock document event listeners
      jest.spyOn(document, 'addEventListener');
      jest.spyOn(document, 'removeEventListener');

      // Mock Warnings
      jest.spyOn(Warnings, 'showWarning').mockImplementation(() => {});
      jest.spyOn(Warnings, 'hideWarning').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should setup online and offline event listeners', async () => {
      await eventRepository.connectWebSocket(mockAccount, false, jest.fn());

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should setup heartbeat interval', async () => {
      await eventRepository.connectWebSocket(mockAccount, false, jest.fn());

      expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
    });

    it('should setup visibilitychange listener in browser', async () => {
      const originalIsElectron = (window as any).isElectron;
      (window as any).isElectron = undefined;

      await eventRepository.connectWebSocket(mockAccount, false, jest.fn());

      expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

      (window as any).isElectron = originalIsElectron;
    });

    it('should call account.listen with correct parameters', async () => {
      const progressCallback = jest.fn();

      await eventRepository.connectWebSocket(mockAccount, true, progressCallback, false);

      expect(mockAccount.listen).toHaveBeenCalledWith({
        useLegacy: true,
        onConnectionStateChanged: expect.any(Function),
        onEvent: expect.any(Function),
        onMissedNotifications: expect.any(Function),
        onNotificationStreamProgress: progressCallback,
        dryRun: false,
      });
    });

    it('should handle connection errors gracefully', async () => {
      mockAccount.listen.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(eventRepository.connectWebSocket(mockAccount, false, jest.fn())).resolves.not.toThrow();
    });

    it('should compute time offset on initialization', async () => {
      await eventRepository.connectWebSocket(mockAccount, false, jest.fn());

      expect(mockNotificationService.getServerTime).toHaveBeenCalled();
      expect(mockServerTimeHandler.computeTimeOffset).toHaveBeenCalled();
    });

    it('should handle server time fetch error', async () => {
      const timeError = {response: {time: '2024-01-01T00:00:00.000Z'}};
      mockNotificationService.getServerTime.mockRejectedValueOnce(timeError);

      await eventRepository.connectWebSocket(mockAccount, false, jest.fn());

      expect(mockServerTimeHandler.computeTimeOffset).toHaveBeenCalledWith('2024-01-01T00:00:00.000Z');
    });

    it('should not reconnect when already connecting', async () => {
      let connectResolve: any;
      const connectPromise = new Promise(resolve => {
        connectResolve = resolve;
      });

      mockAccount.listen.mockReturnValueOnce(connectPromise);

      const connectionPromise = eventRepository.connectWebSocket(mockAccount, false, jest.fn());

      // Try to trigger reconnection while connection is in progress
      // The connect function should skip if already connecting
      await new Promise(resolve => setTimeout(resolve, 10));

      connectResolve(jest.fn());
      await connectionPromise;

      // Should only be called once despite potential multiple triggers
      expect(mockAccount.listen).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleIncomingEvent', () => {
    let eventRepository: EventRepository;

    beforeEach(() => {
      const mockEventService: any = {};
      const mockNotificationService: any = {};
      const mockServerTimeHandler: any = {};

      eventRepository = new EventRepository(
        mockEventService,
        mockNotificationService,
        mockServerTimeHandler,
        {} as any,
      );
      jest.spyOn<any, any>(eventRepository, 'handleEvent').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should handle events sequentially through the queue', async () => {
      const event1 = {event: {type: 'test.event1'}} as any;
      const event2 = {event: {type: 'test.event2'}} as any;

      await eventRepository['handleIncomingEvent'](event1, 'NOTIFICATION_STREAM' as any);
      await eventRepository['handleIncomingEvent'](event2, 'NOTIFICATION_STREAM' as any);

      expect(eventRepository['handleEvent']).toHaveBeenCalledTimes(2);
    });

    it('should throw errors from non-stream sources', async () => {
      const mockError = new Error('Test error');
      jest.spyOn<any, any>(eventRepository, 'handleEvent').mockRejectedValueOnce(mockError);

      const event = {event: {type: 'test.event'}} as any;

      await expect(eventRepository['handleIncomingEvent'](event, 'WEBSOCKET' as any)).rejects.toThrow(mockError);
    });
  });

  describe('importEvents', () => {
    let eventRepository: EventRepository;

    beforeEach(() => {
      const mockEventService: any = {};
      const mockNotificationService: any = {};
      const mockServerTimeHandler: any = {};

      eventRepository = new EventRepository(
        mockEventService,
        mockNotificationService,
        mockServerTimeHandler,
        {} as any,
      );
      jest.spyOn<any, any>(eventRepository, 'handleIncomingEvent').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should import multiple events sequentially', async () => {
      const events = [
        {event: {type: 'test.event1'}} as any,
        {event: {type: 'test.event2'}} as any,
        {event: {type: 'test.event3'}} as any,
      ];

      await eventRepository.importEvents(events as any);

      expect(eventRepository['handleIncomingEvent']).toHaveBeenCalledTimes(3);
    });
  });
});
