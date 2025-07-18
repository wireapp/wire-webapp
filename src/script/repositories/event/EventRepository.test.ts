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

import {ClientConversationEvent} from 'Repositories/conversation/EventBuilder';

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

      return testFactory.event_repository.injectEvent(event).then(() => {
        expect(testFactory.event_repository!['distributeEvent']).toHaveBeenCalled();
      });
    });
  });
});
