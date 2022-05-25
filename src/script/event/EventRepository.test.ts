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
import {init as proteusInit, keys as ProteusKeys} from '@wireapp/proteus';
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
import {OnNotificationCallback, WebSocketService} from './WebSocketService';
import {EventSource} from './EventSource';
import {EventRecord} from '../storage';
import {EventService} from './EventService';
import {StatusType} from '../message/StatusType';

const testFactory = new TestFactory();

async function createEncodedCiphertext(
  preKey: ProteusKeys.PreKey,
  text = 'Hello, World!',
  receivingIdentity = testFactory.cryptography_repository.cryptobox.getIdentity(),
) {
  const bobEngine = new MemoryEngine();
  await bobEngine.init('bob');

  const sender = new Cryptobox(bobEngine, 1);
  await sender.create();

  const genericMessage = new GenericMessage({
    [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: text}),
    messageId: createRandomUuid(),
  });

  const sessionId = `from-${sender
    .getIdentity()
    .public_key.fingerprint()}-to-${preKey.key_pair.public_key.fingerprint()}`;
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
      jest.spyOn(testFactory.notification_service, 'getAllNotificationsForClient').mockResolvedValue([]);
      jest.spyOn(testFactory.notification_service, 'getServerTime').mockResolvedValue(new Date().toISOString());
      jest
        .spyOn(testFactory.notification_service, 'saveLastNotificationIdToDb')
        .mockImplementation(() => Promise.resolve(DatabaseKeys.PRIMARY_KEY_LAST_NOTIFICATION));
    });
  });

  describe('getCommonMessageUpdates', () => {
    /** @see https://wearezeta.atlassian.net/browse/SQCORE-732 */
    it('does not overwrite the seen status if a message gets edited', () => {
      const originalEvent = {
        category: 16,
        conversation: 'a7f1187e-9396-44c9-8242-db9d3051dc89',
        data: {
          content: 'Original Text Which Has Been Seen By Someone Else',
          expects_read_confirmation: true,
          legal_hold_status: 1,
          mentions: [],
          previews: [],
        },
        from: '24de8432-03ba-439f-88f8-95bdc68b7bdd',
        from_client_id: '79618bbe93e6821c',
        id: 'c6269e58-fa82-4f6e-8264-263e09154871',
        primary_key: '17',
        read_receipts: [
          {
            time: '2021-06-10T19:47:19.570Z',
            userId: 'b661e27f-24c6-4c52-a425-87a7b7f3df61',
          },
        ],
        status: StatusType.SEEN,
        time: '2021-06-10T19:47:16.071Z',
        type: 'conversation.message-add',
      } as EventRecord;

      const editedEvent = {
        conversation: 'a7f1187e-9396-44c9-8242-db9d3051dc89',
        data: {
          content: 'Edited Text Which Replaces The Original Text',
          expects_read_confirmation: true,
          mentions: [],
          previews: [],
          replacing_message_id: 'c6269e58-fa82-4f6e-8264-263e09154871',
        },
        from: '24de8432-03ba-439f-88f8-95bdc68b7bdd',
        from_client_id: '79618bbe93e6821c',
        id: 'caff044b-cb9c-47c6-833a-d4b76c678bcd',
        status: StatusType.SENT,
        time: '2021-06-10T19:47:23.706Z',
        type: 'conversation.message-add',
      } as EventRecord;

      const updatedEvent = EventRepository['getCommonMessageUpdates'](originalEvent, editedEvent);
      expect(updatedEvent.data.content).toBe('Edited Text Which Replaces The Original Text');
      expect(updatedEvent.status).toBe(StatusType.SEEN);
      expect(Object.keys(updatedEvent.read_receipts).length).toBe(1);
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
        {event: {type: USER_EVENT.UPDATE} as EventRecord},
        EventSource.NOTIFICATION_STREAM,
      ).then(() => {
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
      });
    });

    it('should not save but distribute "call.*" events', () => {
      return testFactory.event_repository['handleEvent'](
        {event: {type: ClientEvent.CALL.E_CALL} as EventRecord},
        EventSource.NOTIFICATION_STREAM,
      ).then(() => {
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
      });
    });

    it('should not save but distribute "conversation.create" events', () => {
      return testFactory.event_repository['handleEvent'](
        {event: {type: CONVERSATION_EVENT.CREATE} as EventRecord},
        EventSource.NOTIFICATION_STREAM,
      ).then(() => {
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
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
      } as EventRecord;

      return testFactory.event_repository['handleEvent']({event}, EventSource.NOTIFICATION_STREAM).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
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
      } as EventRecord;

      return testFactory.event_repository['handleEvent']({event}, EventSource.NOTIFICATION_STREAM).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(testFactory.event_repository['distributeEvent']).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.member-leave" events', () => {
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        data: {user_ids: ['e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86']},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '9.800122000b3d69bc',
        time: '2016-08-09T12:01:56.363Z',
        type: 'conversation.member-leave',
      } as EventRecord;

      return testFactory.event_repository['handleEvent']({event}, EventSource.NOTIFICATION_STREAM).then(() => {
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
      const eventRepo = new EventRepository(eventServiceSpy, fakeProp, fakeProp, fakeProp);
      eventRepo.notificationHandlingState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      jest.spyOn<any, any>(eventRepo, 'distributeEvent').mockImplementation(() => {});

      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        data: {reason: 'missed'},
        from: '0410795a-58dc-40d8-b216-cbc2360be21a',
        id: '16.800122000b3d4ade',
        time: '2016-08-09T12:09:28.294Z',
        type: 'conversation.voice-channel-deactivate',
      } as EventRecord;
      await eventRepo['handleEvent']({event}, EventSource.NOTIFICATION_STREAM);

      expect(eventServiceSpy.saveEvent).toHaveBeenCalled();
      expect(eventRepo['distributeEvent']).toHaveBeenCalled();
    });

    it('accepts plain decryption error events', () => {
      const event = {
        conversation: '7f0939c8-dbd9-48f5-839e-b0ebcfffec8c',
        error: 'Offset is outside the bounds of the DataView (17cd13b4b2a3a98)',
        errorCode: '1778 (17cd13b4b2a3a98)',
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: 'f518d6ff-19d3-48a0-b0c1-cc71c6e81136',
        time: '2016-08-09T12:58:49.485Z',
        type: 'conversation.unable-to-decrypt',
      } as unknown as EventRecord;

      return testFactory.event_repository['handleEvent']({event}, EventSource.NOTIFICATION_STREAM).then(() => {
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
      const client = new ClientEntity(false, null);
      client.id = ownClientId;
      testFactory.client_repository['clientState'].currentClient(client);

      // Create Cryptobox for testing
      const someEngine = new MemoryEngine();
      await someEngine.init('someEngine');
      const cryptobox = new Cryptobox(someEngine, 10);
      const preKeys = await cryptobox.create();
      testFactory.cryptography_repository.cryptobox = cryptobox;
      testFactory.cryptography_repository['core'].service = {cryptography: {constructSessionId: jest.fn()}} as any;

      const ciphertext = await createEncodedCiphertext(preKeys[0], text, cryptobox.getIdentity());
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

      return testFactory.event_repository['processEvent'](event, EventSource.NOTIFICATION_STREAM).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
      });
    });

    it('ignores an event with an ID previously used by another user', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      previously_stored_event.from = createRandomUuid();
      jest
        .spyOn(testFactory.event_service, 'loadEvent')
        .mockImplementation(() => Promise.resolve(previously_stored_event));

      return testFactory.event_repository['processEvent'](event, EventSource.NOTIFICATION_STREAM)
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

      return testFactory.event_repository['processEvent'](event, EventSource.NOTIFICATION_STREAM)
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

      return testFactory.event_repository['processEvent'](event, EventSource.NOTIFICATION_STREAM)
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

      return testFactory.event_repository['processEvent'](event, EventSource.NOTIFICATION_STREAM)
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

      return testFactory.event_repository['processEvent'](event, EventSource.NOTIFICATION_STREAM)
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

      return testFactory.event_repository['processEvent'](event, EventSource.NOTIFICATION_STREAM).then(saved_event => {
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

      return testFactory.event_repository['processEvent'](assetAddEvent, EventSource.NOTIFICATION_STREAM).then(
        updatedEvent => {
          expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
          expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        },
      );
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

        const savedEvent = await testFactory.event_repository['processEvent'](
          assetCancelEvent,
          EventSource.NOTIFICATION_STREAM,
        );
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

      return testFactory.event_repository['processEvent'](assetUploadFailedEvent, EventSource.NOTIFICATION_STREAM).then(
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

      const savedEvent = await testFactory.event_repository['processEvent'](
        assetUploadFailedEvent,
        EventSource.NOTIFICATION_STREAM,
      );
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

      return testFactory.event_repository['processEvent'](updateStatusEvent, EventSource.NOTIFICATION_STREAM).then(
        updatedEvent => {
          expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
          expect(updatedEvent.data.status).toEqual(updateStatusEvent.data.status);
          expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
        },
      );
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

      return testFactory.event_repository['processEvent'](AssetPreviewEvent, EventSource.NOTIFICATION_STREAM).then(
        (updatedEvent: EventRecord) => {
          expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
          expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
        },
      );
    });
  });
});
