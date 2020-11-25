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
import {GenericMessage, Text, Asset as ProtobufAsset} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';
import * as Proteus from '@wireapp/proteus';
import {CONVERSATION_EVENT, USER_EVENT} from '@wireapp/api-client/src/event';

import {createRandomUuid, arrayToBase64} from 'Util/util';

import {GENERIC_MESSAGE_TYPE} from 'src/script/cryptography/GenericMessageType';
import {ClientEvent} from 'src/script/event/Client';
import {NOTIFICATION_HANDLING_STATE} from 'src/script/event/NotificationHandlingState';
import {EventRepository} from 'src/script/event/EventRepository';
import {NotificationService} from 'src/script/event/NotificationService';
import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import {ClientEntity} from 'src/script/client/ClientEntity';
import {EventError} from 'src/script/error/EventError';
import {TestFactory} from '../../helper/TestFactory';
import {AbortHandler} from '@wireapp/api-client/src/tcp';

const testFactory = new TestFactory();

async function createEncodedCiphertext(
  preKey,
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
  const preKeyBundle = new Proteus.keys.PreKeyBundle(receivingIdentity.public_key, preKey);

  const cipherText = await sender.encrypt(
    sessionId,
    GenericMessage.encode(genericMessage).finish(),
    preKeyBundle.serialise(),
  );

  return arrayToBase64(cipherText);
}

describe('EventRepository', () => {
  let last_notification_id = undefined;

  const websocket_service_mock = (() => {
    let websocket_handler = null;

    return {
      connect(handler) {
        return (websocket_handler = handler);
      },

      publish(payload) {
        return websocket_handler(payload);
      },
    };
  })();

  beforeAll(() => testFactory.exposeClientActors());

  beforeEach(() => {
    return testFactory.exposeEventActors().then(event_repository => {
      event_repository.webSocketService = websocket_service_mock;
      last_notification_id = undefined;
    });
  });

  describe('updateFromStream', () => {
    const latestNotificationId = createRandomUuid();

    beforeEach(() => {
      spyOn(testFactory.event_repository, 'handleNotification').and.callThrough();
      spyOn(testFactory.event_repository, 'handleEvent');
      spyOn(testFactory.event_repository, 'distributeEvent');

      spyOn(testFactory.notification_service, 'getAllNotificationsForClient').and.callFake(() => {
        return new Promise(resolve => {
          window.setTimeout(() => {
            resolve([
              {id: createRandomUuid(), payload: []},
              {id: latestNotificationId, payload: []},
            ]);
          }, 10);
        });
      });

      spyOn(testFactory.notification_service, 'getNotificationsLast').and.returnValue(
        Promise.resolve({id: latestNotificationId, payload: [{}]}),
      );

      spyOn(testFactory.notification_service, 'getLastNotificationIdFromDb').and.callFake(() => {
        return last_notification_id
          ? Promise.resolve(last_notification_id)
          : Promise.reject(new EventError(EventError.TYPE.NO_LAST_ID, EventError.MESSAGE.NO_LAST_ID));
      });

      spyOn(testFactory.notification_service, 'saveLastNotificationIdToDb').and.returnValue(
        Promise.resolve(NotificationService.prototype.PRIMARY_KEY_LAST_NOTIFICATION),
      );
    });

    it('should fetch last notifications ID from backend if not found in storage', async () => {
      const abortHandler = new AbortHandler();
      const missedEventsSpy = jasmine.createSpy('missedEventsSpy');
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MISSED_EVENTS);
      amplify.subscribe(WebAppEvents.CONVERSATION.MISSED_EVENTS, missedEventsSpy);

      const clientId = testFactory.event_repository.currentClient().id;

      expect(testFactory.event_repository.lastNotificationId()).toBeUndefined();

      testFactory.event_repository.connectWebSocket();
      await testFactory.event_repository.initializeFromStream(abortHandler);

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

    it('should not update last notification id if transient is true', () => {
      const notification_payload = {id: createRandomUuid(), payload: [], transient: true};

      return testFactory.event_repository.handleNotification(notification_payload).then(() => {
        expect(testFactory.event_repository.lastNotificationId()).toBe(last_notification_id);
      });
    });

    it('should update last notification id if transient is false', () => {
      const notification_payload = {id: createRandomUuid(), payload: [], transient: false};

      return testFactory.event_repository.handleNotification(notification_payload).then(() => {
        expect(testFactory.event_repository.lastNotificationId()).toBe(notification_payload.id);
      });
    });

    it('should update last notification id if transient is not present', () => {
      const notification_payload = {id: createRandomUuid(), payload: []};

      return testFactory.event_repository.handleNotification(notification_payload).then(() => {
        expect(testFactory.event_repository.lastNotificationId()).toBe(notification_payload.id);
      });
    });
  });

  describe('handleEvent', () => {
    beforeEach(() => {
      testFactory.event_repository.notificationHandlingState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      spyOn(testFactory.event_service, 'saveEvent').and.returnValue(Promise.resolve({data: 'dummy content'}));
      spyOn(testFactory.event_repository, 'distributeEvent');
    });

    it('should not save but distribute "user.*" events', () => {
      return testFactory.event_repository.handleEvent({type: USER_EVENT.UPDATE}).then(() => {
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(testFactory.event_repository.distributeEvent).toHaveBeenCalled();
      });
    });

    it('should not save but distribute "call.*" events', () => {
      return testFactory.event_repository.handleEvent({type: ClientEvent.CALL.E_CALL}).then(() => {
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(testFactory.event_repository.distributeEvent).toHaveBeenCalled();
      });
    });

    it('should not save but distribute "conversation.create" events', () => {
      return testFactory.event_repository.handleEvent({type: CONVERSATION_EVENT.CREATE}).then(() => {
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(testFactory.event_repository.distributeEvent).toHaveBeenCalled();
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
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.event_repository.handleEvent(event).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(testFactory.event_repository.distributeEvent).toHaveBeenCalled();
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
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.event_repository.handleEvent(event).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(testFactory.event_repository.distributeEvent).toHaveBeenCalled();
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
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.event_repository.handleEvent(event).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(testFactory.event_repository.distributeEvent).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.voice-channel-deactivate" (missed call) events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T12:09:28.294Z',
        data: {reason: 'missed'},
        from: '0410795a-58dc-40d8-b216-cbc2360be21a',
        id: '16.800122000b3d4ade',
        type: 'conversation.voice-channel-deactivate',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.event_repository.handleEvent(event).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(testFactory.event_repository.distributeEvent).toHaveBeenCalled();
      });
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
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.event_repository.handleEvent(event).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(testFactory.event_repository.distributeEvent).toHaveBeenCalled();
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
      };
      const source = EventRepository.SOURCE.STREAM;
      const messagePayload = await testFactory.event_repository.processEvent(event, source);

      expect(messagePayload.data.content).toBe(text);
    });
  });

  describe('processEvent', () => {
    let event = undefined;
    let previously_stored_event = undefined;

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
      };

      spyOn(testFactory.event_service, 'saveEvent').and.callFake(saved_event => Promise.resolve(saved_event));
    });

    it('saves an event with a previously not used ID', () => {
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve());

      return testFactory.event_repository.processEvent(event).then(() => {
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
      });
    });

    it('ignores an event with an ID previously used by another user', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      previously_stored_event.from = createRandomUuid();
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return testFactory.event_repository
        .processEvent(event)
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
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return testFactory.event_repository
        .handleEventSaving(event)
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
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return testFactory.event_repository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(EventError));
          expect(error.type).toBe(EventError.TYPE.VALIDATION_FAILED);
          expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a plain text message with an ID previously used by the same user', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return testFactory.event_repository
        .processEvent(event)
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
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return testFactory.event_repository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(EventError));
          expect(error.type).toBe(EventError.TYPE.VALIDATION_FAILED);
          expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message different content', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      event.data.previews.push(1);
      event.data.content = 'Ipsum loren';

      return testFactory.event_repository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(EventError));
          expect(error.type).toBe(EventError.TYPE.VALIDATION_FAILED);
          expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('saves a text message with link preview with an ID previously used by the same user for a plain text message', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));
      spyOn(testFactory.event_service, 'replaceEvent').and.returnValue(Promise.resolve(previously_stored_event));

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      event.data.previews.push(1);
      event.time = changed_time;

      return testFactory.event_repository.processEvent(event).then(saved_event => {
        expect(saved_event.time).toEqual(initial_time);
        expect(saved_event.time).not.toEqual(changed_time);
        expect(saved_event.primary_key).toEqual(previously_stored_event.primary_key);
        expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
      });
    });

    it('ignores edit message with missing associated original message', () => {
      const linkPreviewEvent = JSON.parse(JSON.stringify(event));
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve());
      spyOn(testFactory.event_service, 'replaceEvent').and.returnValue(Promise.resolve());

      linkPreviewEvent.data.replacing_message_id = 'initial_message_id';

      return testFactory.event_repository
        .handleEventSaving(linkPreviewEvent)
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
      };
      const linkPreviewEvent = {...event};
      spyOn(testFactory.event_service, 'loadEvent').and.callFake((conversationId, messageId) => {
        return messageId === replacingId ? Promise.resolve() : Promise.resolve(storedEvent);
      });
      spyOn(testFactory.event_service, 'replaceEvent').and.callFake(ev => ev);

      linkPreviewEvent.data.replacing_message_id = replacingId;
      linkPreviewEvent.data.previews = ['preview'];

      return testFactory.event_repository.handleEventSaving(linkPreviewEvent).then(updatedEvent => {
        expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(updatedEvent.data.previews[0]).toEqual('preview');
      });
    });

    it('updates edited messages', () => {
      const originalMessage = JSON.parse(JSON.stringify(event));
      originalMessage.reactions = ['user-id'];
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(originalMessage));
      spyOn(testFactory.event_service, 'replaceEvent').and.callFake(updates => updates);

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      originalMessage.primary_key = 12;
      event.id = createRandomUuid();
      event.data.content = 'new content';
      event.data.replacing_message_id = originalMessage.id;
      event.time = changed_time;

      return testFactory.event_repository.handleEventSaving(event).then(updatedEvent => {
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
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(storedEvent));
      spyOn(testFactory.event_service, 'replaceEvent').and.callFake(ev => ev);

      editEvent.data.replacing_message_id = replacingId;

      return testFactory.event_repository.handleEventSaving(editEvent).then(updatedEvent => {
        expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
        expect(testFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(updatedEvent.data.previews.length).toEqual(0);
      });
    });

    it('saves a conversation.asset-add event', () => {
      const assetAddEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};

      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve());

      return testFactory.event_repository.processEvent(assetAddEvent).then(updatedEvent => {
        expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(testFactory.event_service.saveEvent).toHaveBeenCalled();
      });
    });

    it('deletes cancelled conversation.asset-add event', () => {
      const froms = [
        // cancel from an other user
        'other-user-id',
        // cancel from the self user
        testFactory.user_repository['userState'].self().id,
      ];

      const loadEventSpy = spyOn(testFactory.event_service, 'loadEvent');
      const deleteEventSpy = spyOn(testFactory.event_service, 'deleteEvent');
      const testPromises = froms.map(from => {
        const assetAddEvent = {...event, from, type: ClientEvent.CONVERSATION.ASSET_ADD};
        const assetCancelEvent = {
          ...assetAddEvent,
          data: {reason: ProtobufAsset.NotUploaded.CANCELLED, status: AssetTransferState.UPLOAD_FAILED},
          time: '2017-09-06T09:43:36.528Z',
        };

        spyOn(testFactory.event_repository['userState'], 'self').and.returnValue({id: assetAddEvent.from});
        loadEventSpy.and.returnValue(Promise.resolve(assetAddEvent));
        deleteEventSpy.and.returnValue(Promise.resolve());

        return testFactory.event_repository.processEvent(assetCancelEvent).then(savedEvent => {
          expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalled();
        });
      });

      return Promise.all(testPromises);
    });

    it('deletes other user failed upload for conversation.asset-add event', () => {
      const assetAddEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};
      const assetUploadFailedEvent = {
        ...assetAddEvent,
        data: {reason: ProtobufAsset.NotUploaded.FAILED, status: AssetTransferState.UPLOAD_FAILED},
        time: '2017-09-06T09:43:36.528Z',
      };

      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(assetAddEvent));
      spyOn(testFactory.event_service, 'deleteEvent').and.returnValue(Promise.resolve());

      return testFactory.event_repository.processEvent(assetUploadFailedEvent).then(savedEvent => {
        expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(testFactory.event_service.deleteEvent).toHaveBeenCalled();
      });
    });

    it('updates self failed upload for conversation.asset-add event', () => {
      const assetAddEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};
      const assetUploadFailedEvent = {
        ...assetAddEvent,
        data: {reason: ProtobufAsset.NotUploaded.FAILED, status: AssetTransferState.UPLOAD_FAILED},
        time: '2017-09-06T09:43:36.528Z',
      };

      spyOn(testFactory.event_repository['userState'], 'self').and.returnValue({id: assetAddEvent.from});
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(assetAddEvent));
      spyOn(testFactory.event_service, 'updateEventAsUploadFailed').and.returnValue(
        Promise.resolve(assetUploadFailedEvent),
      );

      return testFactory.event_repository.processEvent(assetUploadFailedEvent).then(savedEvent => {
        expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(testFactory.event_service.updateEventAsUploadFailed).toHaveBeenCalled();
      });
    });

    it('handles conversation.asset-add state update event', () => {
      const initialAssetEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};

      const updateStatusEvent = {
        ...initialAssetEvent,
        data: {status: AssetTransferState.UPLOADED},
        time: '2017-09-06T09:43:36.528Z',
      };

      spyOn(testFactory.event_service, 'replaceEvent').and.callFake(eventToUpdate => Promise.resolve(eventToUpdate));
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(initialAssetEvent));

      return testFactory.event_repository.processEvent(updateStatusEvent).then(updatedEvent => {
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

      spyOn(testFactory.event_service, 'replaceEvent').and.callFake(eventToUpdate => Promise.resolve(eventToUpdate));
      spyOn(testFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(initialAssetEvent));

      return testFactory.event_repository.processEvent(AssetPreviewEvent).then(updatedEvent => {
        expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(updatedEvent.data.preview_key).toEqual(AssetPreviewEvent.data.preview_key);
        expect(testFactory.event_service.replaceEvent).toHaveBeenCalled();
      });
    });
  });
});
