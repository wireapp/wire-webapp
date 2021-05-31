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

import {MemoryEngine} from '@wireapp/store-engine';
import {Cryptobox} from '@wireapp/cryptobox';
import {Asset as ProtobufAsset, GenericMessage, Text} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';
import {keys as ProteusKeys, init as proteusInit} from '@wireapp/proteus';
import {CONVERSATION_EVENT, USER_EVENT} from '@wireapp/api-client/src/event/';
import type {Notification} from '@wireapp/api-client/src/notification/';
import {DatabaseKeys} from '@wireapp/core/src/main/notification/NotificationDatabaseRepository';
import {arrayToBase64, createRandomUuid} from 'Util/util';
import {GENERIC_MESSAGE_TYPE} from 'src/script/cryptography/GenericMessageType';
import {ClientEvent} from 'src/script/event/Client';
import {NOTIFICATION_HANDLING_STATE} from 'src/script/event/NotificationHandlingState';
import {EventRepository} from 'src/script/event/EventRepository';
import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import {ClientEntity} from 'src/script/client/ClientEntity';
import {EventError} from 'src/script/error/EventError';
import {TestFactory} from '../../../test/helper/TestFactory';
import {AbortHandler} from '@wireapp/api-client/src/tcp/';
import {OnNotificationCallback, WebSocketService} from './WebSocketService';
import {amplify} from 'amplify';
import {EventSource} from './EventSource';
import {EventRecord} from '../storage';
import {EventService} from './EventService';
import {CryptographyError} from '../error/CryptographyError';

const testFactory = new TestFactory();

async function createEncodedCiphertext(
  preKey: ProteusKeys.PreKey,
  text = 'Hello, World!',
  receivingIdentity = testFactory.cryptography_repository.cryptobox.identity,
) {
  const bobEngine = new MemoryEngine();
  await bobEngine.init('bob');

  const sender = new Cryptobox(bobEngine, 1);
  await sender.create();

  const genericMessage = new GenericMessage({
    [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: text}),
    messageId: createRandomUuid(),
  });

  const sessionId = `from-${sender.identity.public_key.fingerprint()}-to-${preKey.key_pair.public_key.fingerprint()}`;
  const preKeyBundle = new ProteusKeys.PreKeyBundle(receivingIdentity.public_key, preKey);

  const cipherText = await sender.encrypt(
    sessionId,
    GenericMessage.encode(genericMessage).finish(),
    preKeyBundle.serialise(),
  );

  return arrayToBase64(cipherText);
}

beforeAll(async () => {
  await proteusInit();
});

describe('EventRepository', () => {
  let last_notification_id: string;

  class WebSocketServiceMock extends WebSocketService {
    private websocket_handler: OnNotificationCallback;

    async connect(onNotification: OnNotificationCallback): Promise<void> {
      this.websocket_handler = onNotification;
    }

    publish(data: Notification) {
      this.websocket_handler(data);
    }
  }

  beforeAll(() => testFactory.exposeClientActors());

  beforeEach(() => {
    return testFactory.exposeEventActors().then(event_repository => {
      (event_repository as any).webSocketService = new WebSocketServiceMock();
      last_notification_id = undefined;
    });
  });

  describe('updateFromStream', () => {
    const latestNotificationId = createRandomUuid();

    beforeEach(() => {
      jest.spyOn<EventRepository, any>(testFactory.event_repository, 'handleNotification');
      jest.spyOn<EventRepository, any>(testFactory.event_repository, 'handleEvent');
      jest.spyOn<EventRepository, any>(testFactory.event_repository, 'distributeEvent');

      jest.spyOn(testFactory.notification_service, 'getAllNotificationsForClient').mockImplementation(() => {
        return new Promise(resolve => {
          window.setTimeout(() => {
            resolve([
              {id: createRandomUuid(), payload: []},
              {id: latestNotificationId, payload: []},
            ]);
          }, 10);
        });
      });

      jest.spyOn(testFactory.notification_service, 'getNotificationsLast').mockImplementation(() => {
        const notification = {id: latestNotificationId, payload: [{}]} as Notification;
        return Promise.resolve(notification);
      });

      jest.spyOn(testFactory.notification_service, 'getLastNotificationIdFromDb').mockImplementation(() => {
        return last_notification_id
          ? Promise.resolve(last_notification_id)
          : Promise.reject(new EventError(EventError.TYPE.NO_LAST_ID, EventError.MESSAGE.NO_LAST_ID));
      });

      jest
        .spyOn(testFactory.notification_service, 'saveLastNotificationIdToDb')
        .mockImplementation(() => Promise.resolve(DatabaseKeys.PRIMARY_KEY_LAST_NOTIFICATION));
    });

    it('should fetch last notifications ID from backend if not found in storage', async () => {
      const abortHandler = new AbortHandler();
      const missedEventsSpy = jasmine.createSpy('missedEventsSpy');
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MISSED_EVENTS);
      amplify.subscribe(WebAppEvents.CONVERSATION.MISSED_EVENTS, missedEventsSpy);

      const clientId = testFactory.event_repository.currentClient().id;

      expect(testFactory.event_repository.lastNotificationId()).toBeUndefined();

      testFactory.event_repository.connectWebSocket();
      await testFactory.event_repository['initializeFromStream'](abortHandler);

      expect(testFactory.notification_service.getLastNotificationIdFromDb).toBeDefined();
      expect(testFactory.notification_service.getNotificationsLast).toHaveBeenCalledWith(clientId);
      expect(testFactory.notification_service.getAllNotificationsForClient).toHaveBeenCalledWith(
        clientId,
        latestNotificationId,
      );

      expect(missedEventsSpy).toHaveBeenCalled();
    });
  });

  describe('handleNotification', () => {
    last_notification_id = undefined;

    beforeEach(() => {
      last_notification_id = createRandomUuid();
      testFactory.event_repository.lastNotificationId(last_notification_id);
    });

    it('continues processing when one event fails to decrypt', async () => {
      const notificationId = createRandomUuid();
      const notificationWithMultipleEvents: Notification = {
        id: notificationId,
        payload: [
          {
            conversation: '7e756d05-66ea-411f-b896-3367475a08da',
            data: {
              recipient: 'a585dd8c2a8cff9',
              sender: '3b9d5569809b5a8e',
              text: 'A',
            },
            from: '44bd776e-8719-4320-b1a0-354ccd8e983a',
            time: '2021-03-22T16:40:13.076Z',
            type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          },
          {
            conversation: '7e756d05-66ea-411f-b896-3367475a08da',
            data: {
              recipient: 'a585dd8c2a8cff9',
              sender: '3b9d5569809b5a8e',
              text: 'B',
            },
            from: '44bd776e-8719-4320-b1a0-354ccd8e983a',
            time: '2021-03-22T16:41:13.076Z',
            type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          },
          {
            conversation: '7e756d05-66ea-411f-b896-3367475a08da',
            data: {
              recipient: 'a585dd8c2a8cff9',
              sender: '3b9d5569809b5a8e',
              text: 'C',
            },
            from: '44bd776e-8719-4320-b1a0-354ccd8e983a',
            time: '2021-03-22T16:42:13.076Z',
            type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
          },
        ],
        transient: false,
      };

      const spy = jest
        .spyOn<EventRepository, any>(testFactory.event_repository, 'handleEvent')
        .mockImplementation((event: EventRecord) => {
          if (event.time === (notificationWithMultipleEvents.payload[1] as EventRecord).time) {
            throw new CryptographyError(
              CryptographyError.TYPE.UNHANDLED_TYPE,
              'Mimic event decryption error for testing purposes.',
            );
          }
          return event;
        });

      await testFactory.event_repository['handleNotification'](notificationWithMultipleEvents);
      expect(spy).toHaveBeenCalledTimes(notificationWithMultipleEvents.payload.length);
    });

    it('should not update last notification id if transient is true', () => {
      const notification_payload = {id: createRandomUuid(), payload: [], transient: true} as Notification;

      return testFactory.event_repository['handleNotification'](notification_payload).then(() => {
        expect(testFactory.event_repository.lastNotificationId()).toBe(last_notification_id);
      });
    });

    it('should update last notification id if transient is false', () => {
      const notification_payload = {id: createRandomUuid(), payload: [], transient: false} as Notification;

      return testFactory.event_repository['handleNotification'](notification_payload).then(() => {
        expect(testFactory.event_repository.lastNotificationId()).toBe(notification_payload.id);
      });
    });

    it('should update last notification id if transient is not present', () => {
      const notification_payload = {id: createRandomUuid(), payload: []} as Notification;

      return testFactory.event_repository['handleNotification'](notification_payload).then(() => {
        expect(testFactory.event_repository.lastNotificationId()).toBe(notification_payload.id);
      });
    });
  });

  describe('handleEvent', () => {
    beforeEach(() => {
      testFactory.event_repository.notificationHandlingState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      jest
        .spyOn(testFactory.event_service, 'saveEvent')
        .mockReturnValue(Promise.resolve({data: 'dummy content'} as EventRecord));
      spyOn<any>(testFactory.event_repository, 'distributeEvent');
    });

    it('should not save but distribute "user.*" events', () => {
      return testFactory.event_repository['handleEvent'](
        {type: USER_EVENT.UPDATE} as EventRecord,
        EventSource.STREAM,
      ).then(() => {
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
      });
    });

    it('should not save but distribute "call.*" events', () => {
      return testFactory.event_repository['handleEvent'](
        {type: ClientEvent.CALL.E_CALL} as EventRecord,
        EventSource.STREAM,
      ).then(() => {
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
      });
    });

    it('should not save but distribute "conversation.create" events', () => {
      return testFactory.event_repository['handleEvent'](
        {type: CONVERSATION_EVENT.CREATE} as EventRecord,
        EventSource.STREAM,
      ).then(() => {
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.rename" events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T11:57:37.498Z',
        data: {name: 'Renamed'},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '7.800122000b2f7cca',
        type: 'conversation.rename',
      } as EventRecord;
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.event_repository['handleEvent'](event, EventSource.STREAM).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.member-join" events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T12:01:14.688Z',
        data: {user_ids: ['e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86']},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '8.800122000b2f7d20',
        type: 'conversation.member-join',
      } as EventRecord;
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.event_repository['handleEvent'](event, EventSource.STREAM).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.member-leave" events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T12:01:56.363Z',
        data: {user_ids: ['e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86']},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '9.800122000b3d69bc',
        type: 'conversation.member-leave',
      } as EventRecord;
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.event_repository['handleEvent'](event, EventSource.STREAM).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.voice-channel-deactivate" (missed call) events', async () => {
      const eventServiceSpy = {
        loadEvent: jest.fn().mockImplementation(() => Promise.resolve()),
        saveEvent: jest.fn().mockImplementation(() => Promise.resolve({data: 'dummy content'})),
      } as unknown as EventService;
      const fakeProp: any = undefined;
      const eventRepo = new EventRepository(eventServiceSpy, fakeProp, fakeProp, fakeProp, fakeProp, fakeProp);
      eventRepo.notificationHandlingState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      jest.spyOn(eventRepo as any, 'distributeEvent').mockImplementation(() => {});

      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T12:09:28.294Z',
        data: {reason: 'missed'},
        from: '0410795a-58dc-40d8-b216-cbc2360be21a',
        id: '16.800122000b3d4ade',
        type: 'conversation.voice-channel-deactivate',
      } as EventRecord;
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      await eventRepo['handleEvent'](event, EventSource.STREAM);

      expect(eventServiceSpy.saveEvent).toHaveBeenCalled();
      expect(eventRepo['distributeEvent']).toHaveBeenCalled();
    });

    it('accepts plain decryption error events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const event = {
        conversation: '7f0939c8-dbd9-48f5-839e-b0ebcfffec8c',
        id: 'f518d6ff-19d3-48a0-b0c1-cc71c6e81136',
        type: 'conversation.unable-to-decrypt',
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        time: '2016-08-09T12:58:49.485Z',
        error: 'Offset is outside the bounds of the DataView (17cd13b4b2a3a98)',
        errorCode: '1778 (17cd13b4b2a3a98)',
      } as unknown as EventRecord;
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.event_repository['handleEvent'](event, EventSource.STREAM).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
      });
    });
  });

  describe('processEvent', () => {
    it('processes OTR events', async () => {
      const text = 'Hello, this is a test!';

      // Create client for testing
      const ownClientId = 'f180a823bf0d1204';
      const client = new ClientEntity();
      client.id = ownClientId;
      testFactory.client_repository['clientState'].currentClient(client);

      // Create Cryptobox for testing
      const someEngine = new MemoryEngine();
      await someEngine.init('someEngine');
      const cryptobox = new Cryptobox(someEngine, 10);
      const preKeys = await cryptobox.create();
      testFactory.cryptography_repository.cryptobox = cryptobox;

      const ciphertext = await createEncodedCiphertext(preKeys[0], text, cryptobox.identity);
      const event = {
        conversation: 'fdc6cf1a-4e37-424e-a106-ab3d2cc5c8e0',
        data: {
          recipient: ownClientId,
          sender: '4c28652a6dd21938',
          text: ciphertext,
        },
        from: '6f88716b-1383-44da-9d57-45b51cc64d90',
        time: '2018-07-10T14:54:21.621Z',
        type: 'conversation.otr-message-add',
      } as EventRecord;
      const source = EventRepository.SOURCE.STREAM;
      const messagePayload = await testFactory.event_repository['processEvent'](event, source);

      expect(messagePayload.data.content).toBe(text);
    });
  });

  describe('processEvent', () => {
    let event: EventRecord;
    let previously_stored_event: EventRecord;

    beforeEach(() => {
      event = {
        conversation: createRandomUuid(),
        data: {
          content: 'Lorem Ipsum',
          previews: [],
        },
        from: createRandomUuid(),
        id: createRandomUuid(),
        time: new Date().toISOString(),
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
      } as EventRecord;

      jest
        .spyOn(testFactory.event_service, 'saveEvent')
        .mockImplementation(saved_event => Promise.resolve(saved_event));
    });

    it('saves an event with a previously not used ID', () => {
      jest.spyOn(testFactory.event_service, 'loadEvent').mockClear();

      return testFactory.event_repository['processEvent'](event, EventSource.STREAM).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
      });
    });

    it('ignores an event with an ID previously used by another user', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      previously_stored_event.from = createRandomUuid();
      jest
        .spyOn(testFactory.event_service, 'loadEvent')
        .mockImplementation(() => Promise.resolve(previously_stored_event));

      return testFactory.event_repository['processEvent'](event, EventSource.STREAM)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(EventError));
          expect(error.type).toBe(EventError.TYPE.VALIDATION_FAILED);
          expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a non-"text message" with an ID previously used by the same user', () => {
      event.type = ClientEvent.CALL.E_CALL;
      previously_stored_event = JSON.parse(JSON.stringify(event));
      jest
        .spyOn(testFactory.event_service, 'loadEvent')
        .mockImplementation(() => Promise.resolve(previously_stored_event));

      return testFactory.event_repository['handleEventSaving'](event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(EventError));
          expect(error.type).toBe(EventError.TYPE.VALIDATION_FAILED);
          expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a plain text message with an ID previously used by the same user for a non-"text message"', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      previously_stored_event.type = ClientEvent.CALL.E_CALL;
      jest
        .spyOn(testFactory.event_service, 'loadEvent')
        .mockImplementation(() => Promise.resolve(previously_stored_event));

      return testFactory.event_repository['processEvent'](event, EventSource.STREAM)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(EventError));
          expect(error.type).toBe(EventError.TYPE.VALIDATION_FAILED);
          expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a plain text message with an ID previously used by the same user', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      jest
        .spyOn(testFactory.event_service, 'loadEvent')
        .mockImplementation(() => Promise.resolve(previously_stored_event));

      return testFactory.event_repository['processEvent'](event, EventSource.STREAM)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(EventError));
          expect(error.type).toBe(EventError.TYPE.VALIDATION_FAILED);
          expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message with link preview', () => {
      event.data.previews.push(1);
      previously_stored_event = JSON.parse(JSON.stringify(event));
      jest
        .spyOn(testFactory.event_service, 'loadEvent')
        .mockImplementation(() => Promise.resolve(previously_stored_event));

      return testFactory.event_repository['processEvent'](event, EventSource.STREAM)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(EventError));
          expect(error.type).toBe(EventError.TYPE.VALIDATION_FAILED);
          expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message different content', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      jest
        .spyOn(testFactory.event_service, 'loadEvent')
        .mockImplementation(() => Promise.resolve(previously_stored_event));

      event.data.previews.push(1);
      event.data.content = 'Ipsum loren';

      return testFactory.event_repository['processEvent'](event, EventSource.STREAM)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(EventError));
          expect(error.type).toBe(EventError.TYPE.VALIDATION_FAILED);
          expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('saves a text message with link preview with an ID previously used by the same user for a plain text message', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      jest.spyOn(testFactory.event_service, 'loadEvent').mockImplementation(async () => previously_stored_event);
      jest
        .spyOn(testFactory.event_service, 'replaceEvent')
        .mockImplementation(() => Promise.resolve(previously_stored_event));

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      event.data.previews.push(1);
      event.time = changed_time;

      return testFactory.event_repository['processEvent'](event, EventSource.STREAM).then(saved_event => {
        expect(saved_event.time).toEqual(initial_time);
        expect(saved_event.time).not.toEqual(changed_time);
        expect(saved_event.primary_key).toEqual(previously_stored_event.primary_key);
        expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
      });
    });

    it('ignores edit message with missing associated original message', () => {
      const linkPreviewEvent = JSON.parse(JSON.stringify(event));
      jest.spyOn(testFactory.event_service, 'loadEvent').mockImplementation(() => Promise.resolve({} as EventRecord));
      jest
        .spyOn(testFactory.event_service, 'replaceEvent')
        .mockImplementation(() => Promise.resolve({} as EventRecord));

      linkPreviewEvent.data.replacing_message_id = 'initial_message_id';

      return testFactory.event_repository['handleEventSaving'](linkPreviewEvent)
        .then(() => fail('Should have thrown an error'))
        .catch(() => {
          expect(testFactory.event_service.replaceEvent).not.toHaveBeenCalled();
          expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('updates edited messages when link preview arrives', () => {
      const replacingId = 'old-replaced-message-id';
      const storedEvent = {
        ...event,
        data: {...event.data, replacing_message_id: replacingId},
      } as EventRecord;
      const linkPreviewEvent = {...event};
      jest
        .spyOn(testFactory.event_service, 'loadEvent')
        .mockImplementation((conversationId: string, messageId: string) => {
          return messageId === replacingId ? Promise.resolve(undefined) : Promise.resolve(storedEvent);
        });
      jest
        .spyOn(testFactory.event_service, 'replaceEvent')
        .mockImplementation((ev: EventRecord) => Promise.resolve(ev));

      linkPreviewEvent.data.replacing_message_id = replacingId;
      linkPreviewEvent.data.previews = ['preview'];

      return testFactory.event_repository['handleEventSaving'](linkPreviewEvent).then((updatedEvent: EventRecord) => {
        expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(updatedEvent.data.previews[0]).toEqual('preview');
      });
    });

    it('updates edited messages', () => {
      const originalMessage = JSON.parse(JSON.stringify(event));
      originalMessage.reactions = ['user-id'];
      jest
        .spyOn(testFactory.event_service, 'loadEvent')
        .mockImplementation(() => Promise.resolve(originalMessage as EventRecord));
      jest
        .spyOn(testFactory.event_service, 'replaceEvent')
        .mockImplementation((updates: EventRecord) => Promise.resolve(updates));

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      originalMessage.primary_key = 12;
      event.id = createRandomUuid();
      event.data.content = 'new content';
      event.data.replacing_message_id = originalMessage.id;
      event.time = changed_time;

      return testFactory.event_repository['handleEventSaving'](event).then((updatedEvent: EventRecord) => {
        expect(updatedEvent.time).toEqual(initial_time);
        expect(updatedEvent.time).not.toEqual(changed_time);
        expect(updatedEvent.data.content).toEqual('new content');
        expect(updatedEvent.primary_key).toEqual(originalMessage.primary_key);
        expect(Object.keys(updatedEvent.reactions).length).toEqual(0);
        expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
      });
    });

    it('updates link preview when edited', () => {
      const replacingId = 'replaced-message-id';
      const storedEvent = {
        ...event,
        data: {...event.data, previews: ['preview']},
      };
      const editEvent = {...event};
      jest.spyOn(testFactory.event_service, 'loadEvent').mockImplementation(() => Promise.resolve(storedEvent));
      jest
        .spyOn(testFactory.event_service, 'replaceEvent')
        .mockImplementation((ev: EventRecord) => Promise.resolve(ev));

      editEvent.data.replacing_message_id = replacingId;

      return testFactory.event_repository['handleEventSaving'](editEvent).then((updatedEvent: EventRecord) => {
        expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(updatedEvent.data.previews.length).toEqual(0);
      });
    });

    it('saves a conversation.asset-add event', () => {
      const assetAddEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};

      jest.spyOn(testFactory.event_service, 'loadEvent').mockClear();

      return testFactory.event_repository['processEvent'](assetAddEvent, EventSource.STREAM).then(updatedEvent => {
        expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
      });
    });

    it('deletes cancelled conversation.asset-add event', async () => {
      const fromIds = [
        // cancel from an other user
        createRandomUuid(),
        // cancel from the self user
        testFactory.user_repository['userState'].self().id,
      ];

      const loadEventSpy = jest.spyOn(testFactory.event_service, 'loadEvent');
      const deleteEventSpy = jest.spyOn(testFactory.event_service, 'deleteEvent');
      for (const fromId of fromIds) {
        const assetAddEvent = {...event, from: fromId, type: ClientEvent.CONVERSATION.ASSET_ADD};
        const assetCancelEvent = {
          ...assetAddEvent,
          data: {reason: ProtobufAsset.NotUploaded.CANCELLED, status: AssetTransferState.UPLOAD_FAILED},
          time: '2017-09-06T09:43:36.528Z',
        };

        loadEventSpy.mockImplementation(() => Promise.resolve(assetAddEvent));
        deleteEventSpy.mockImplementation(() => Promise.resolve(1));

        const savedEvent = await testFactory.event_repository['processEvent'](assetCancelEvent, EventSource.STREAM);
        expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(testFactory.event_service.deleteEvent).toHaveBeenCalled();
      }
    });

    it('deletes other user failed upload for conversation.asset-add event', () => {
      const assetAddEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};
      const assetUploadFailedEvent = {
        ...assetAddEvent,
        data: {reason: ProtobufAsset.NotUploaded.FAILED, status: AssetTransferState.UPLOAD_FAILED},
        time: '2017-09-06T09:43:36.528Z',
      };

      jest.spyOn(testFactory.event_service, 'loadEvent').mockImplementation(() => Promise.resolve(assetAddEvent));
      jest.spyOn(testFactory.event_service, 'deleteEvent').mockImplementation(() => Promise.resolve(1));

      return testFactory.event_repository['processEvent'](assetUploadFailedEvent, EventSource.STREAM).then(
        savedEvent => {
          expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalled();
        },
      );
    });

    it('updates self failed upload for conversation.asset-add event', async () => {
      const assetAddEvent: EventRecord = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};
      const assetUploadFailedEvent: EventRecord = {
        ...assetAddEvent,
        data: {reason: ProtobufAsset.NotUploaded.FAILED, status: AssetTransferState.UPLOAD_FAILED},
        time: '2017-09-06T09:43:36.528Z',
      };

      jest
        .spyOn(testFactory.event_repository['userState'], 'self')
        .mockImplementation(() => ({id: assetAddEvent.from}));
      jest.spyOn(testFactory.event_service, 'loadEvent').mockImplementation(() => Promise.resolve(assetAddEvent));
      jest
        .spyOn(testFactory.event_service, 'updateEventAsUploadFailed')
        .mockImplementation(() => Promise.resolve(assetUploadFailedEvent));

      const savedEvent = await testFactory.event_repository['processEvent'](assetUploadFailedEvent, EventSource.STREAM);
      expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
      expect(testFactory.event_service.updateEventAsUploadFailed).toHaveBeenCalled();
    });

    it('handles conversation.asset-add state update event', () => {
      const initialAssetEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};

      const updateStatusEvent = {
        ...initialAssetEvent,
        data: {status: AssetTransferState.UPLOADED},
        time: '2017-09-06T09:43:36.528Z',
      };

      jest
        .spyOn(testFactory.event_service, 'replaceEvent')
        .mockImplementation(eventToUpdate => Promise.resolve(eventToUpdate));
      jest.spyOn(testFactory.event_service, 'loadEvent').mockImplementation(() => Promise.resolve(initialAssetEvent));

      return testFactory.event_repository['processEvent'](updateStatusEvent, EventSource.STREAM).then(updatedEvent => {
        expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(updatedEvent.data.status).toEqual(updateStatusEvent.data.status);
        expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
      });
    });

    it('updates video when preview is received', () => {
      const initialAssetEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};

      const AssetPreviewEvent = {
        ...initialAssetEvent,
        data: {status: AssetTransferState.UPLOADED},
        time: '2017-09-06T09:43:36.528Z',
      };

      jest
        .spyOn(testFactory.event_service, 'replaceEvent')
        .mockImplementation(eventToUpdate => Promise.resolve(eventToUpdate));
      jest.spyOn(testFactory.event_service, 'loadEvent').mockImplementation(() => Promise.resolve(initialAssetEvent));

      return testFactory.event_repository['processEvent'](AssetPreviewEvent, EventSource.STREAM).then(
        (updatedEvent: EventRecord) => {
          expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
          expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
        },
      );
    });
  });
});
