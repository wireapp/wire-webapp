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
import {GenericMessage, Text} from '@wireapp/protocol-messaging';
import * as Proteus from '@wireapp/proteus';

import {createRandomUuid, arrayToBase64} from 'utils/util';

import {AssetUploadFailedReason} from 'src/script/assets/AssetUploadFailedReason';
import {ClientEvent} from 'src/script/event/Client';
import {BackendEvent} from 'src/script/event/Backend';
import {WebAppEvents} from 'src/script/event/WebApp';
import {NOTIFICATION_HANDLING_STATE} from 'src/script/event/NotificationHandlingState';
import {EventRepository} from 'src/script/event/EventRepository';
import {NotificationService} from 'src/script/event/NotificationService';
import {AssetTransferState} from 'src/script/assets/AssetTransferState';

async function createEncodedCiphertext(
  preKey,
  text = 'Hello, World!',
  receivingIdentity = TestFactory.cryptography_repository.cryptobox.identity
) {
  const bobEngine = new MemoryEngine();
  await bobEngine.init('bob');

  const sender = new Cryptobox(bobEngine, 1);
  await sender.create();

  const genericMessage = new GenericMessage({
    [z.cryptography.GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: text}),
    messageId: createRandomUuid(),
  });

  const sessionId = `from-${sender.identity.public_key.fingerprint()}-to-${preKey.key_pair.public_key.fingerprint()}`;
  const preKeyBundle = Proteus.keys.PreKeyBundle.new(receivingIdentity.public_key, preKey);

  const cipherText = await sender.encrypt(
    sessionId,
    GenericMessage.encode(genericMessage).finish(),
    preKeyBundle.serialise()
  );

  return arrayToBase64(cipherText);
}

describe('Event Repository', () => {
  const test_factory = new TestFactory();
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

  beforeAll(() => test_factory.exposeClientActors());

  beforeEach(() => {
    return test_factory.exposeEventActors().then(event_repository => {
      event_repository.webSocketService = websocket_service_mock;

      last_notification_id = undefined;
    });
  });

  describe('updateFromStream', () => {
    beforeEach(() => {
      spyOn(TestFactory.event_repository, '_handleNotification').and.callThrough();
      spyOn(TestFactory.event_repository, '_bufferWebSocketNotification').and.callThrough();
      spyOn(TestFactory.event_repository, '_handleBufferedNotifications').and.callThrough();
      spyOn(TestFactory.event_repository, '_handleEvent');
      spyOn(TestFactory.event_repository, '_distributeEvent');

      spyOn(TestFactory.notification_service, 'getNotifications').and.callFake(() => {
        return new Promise(resolve => {
          window.setTimeout(() => {
            resolve({
              has_more: false,
              notifications: [{id: createRandomUuid(), payload: []}, {id: createRandomUuid(), payload: []}],
            });
          }, 10);
        });
      });

      spyOn(TestFactory.notification_service, 'getNotificationsLast').and.returnValue(
        Promise.resolve({id: createRandomUuid(), payload: [{}]})
      );

      spyOn(TestFactory.notification_service, 'getLastNotificationIdFromDb').and.callFake(() => {
        return last_notification_id
          ? Promise.resolve(last_notification_id)
          : Promise.reject(new z.error.EventError(z.error.EventError.TYPE.NO_LAST_ID));
      });

      spyOn(TestFactory.notification_service, 'saveLastNotificationIdToDb').and.returnValue(
        Promise.resolve(NotificationService.prototype.PRIMARY_KEY_LAST_NOTIFICATION)
      );
    });

    it('should fetch last notifications ID from backend if not found in storage', () => {
      const missed_events_spy = jasmine.createSpy();
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MISSED_EVENTS);
      amplify.subscribe(WebAppEvents.CONVERSATION.MISSED_EVENTS, missed_events_spy);

      TestFactory.event_repository.connectWebSocket();
      return TestFactory.event_repository.initializeFromStream().then(() => {
        expect(TestFactory.notification_service.getLastNotificationIdFromDb).toHaveBeenCalled();
        expect(TestFactory.notification_service.getNotificationsLast).toHaveBeenCalled();
        expect(TestFactory.notification_service.getNotifications).toHaveBeenCalled();
        expect(missed_events_spy).toHaveBeenCalled();
      });
    });

    it('should buffer notifications when notification stream is not processed', () => {
      last_notification_id = createRandomUuid();
      TestFactory.event_repository.connectWebSocket();
      websocket_service_mock.publish({id: createRandomUuid(), payload: []});

      expect(TestFactory.event_repository._bufferWebSocketNotification).toHaveBeenCalled();
      expect(TestFactory.event_repository._handleNotification).not.toHaveBeenCalled();
      expect(TestFactory.event_repository.notificationHandlingState()).toBe(NOTIFICATION_HANDLING_STATE.STREAM);
      expect(TestFactory.event_repository.webSocketBuffer.length).toBe(1);
    });

    it('should handle buffered notifications after notifications stream was processed', () => {
      last_notification_id = createRandomUuid();
      const last_published_notification_id = createRandomUuid();
      TestFactory.event_repository.lastNotificationId(last_notification_id);
      TestFactory.event_repository.connectWebSocket();
      websocket_service_mock.publish({id: createRandomUuid(), payload: []});

      websocket_service_mock.publish({id: last_published_notification_id, payload: []});
      return TestFactory.event_repository.initializeFromStream().then(() => {
        expect(TestFactory.event_repository._handleBufferedNotifications).toHaveBeenCalled();
        expect(TestFactory.event_repository.webSocketBuffer.length).toBe(0);
        expect(TestFactory.event_repository.lastNotificationId()).toBe(last_published_notification_id);
        expect(TestFactory.event_repository.notificationHandlingState()).toBe(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      });
    });
  });

  describe('_handleNotification', () => {
    last_notification_id = undefined;

    beforeEach(() => {
      last_notification_id = createRandomUuid();
      TestFactory.event_repository.lastNotificationId(last_notification_id);
    });

    it('should not update last notification id if transient is true', () => {
      const notification_payload = {id: createRandomUuid(), payload: [], transient: true};

      return TestFactory.event_repository._handleNotification(notification_payload).then(() => {
        expect(TestFactory.event_repository.lastNotificationId()).toBe(last_notification_id);
      });
    });

    it('should update last notification id if transient is false', () => {
      const notification_payload = {id: createRandomUuid(), payload: [], transient: false};

      return TestFactory.event_repository._handleNotification(notification_payload).then(() => {
        expect(TestFactory.event_repository.lastNotificationId()).toBe(notification_payload.id);
      });
    });

    it('should update last notification id if transient is not present', () => {
      const notification_payload = {id: createRandomUuid(), payload: []};

      return TestFactory.event_repository._handleNotification(notification_payload).then(() => {
        expect(TestFactory.event_repository.lastNotificationId()).toBe(notification_payload.id);
      });
    });
  });

  describe('_handleEvent', () => {
    beforeEach(() => {
      TestFactory.event_repository.notificationHandlingState(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      spyOn(TestFactory.event_service, 'saveEvent').and.returnValue(Promise.resolve({data: 'dummy content'}));
      spyOn(TestFactory.event_repository, '_distributeEvent');
    });

    it('should not save but distribute "user.*" events', () => {
      return TestFactory.event_repository._handleEvent({type: BackendEvent.USER.UPDATE}).then(() => {
        expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(TestFactory.event_repository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('should not save but distribute "call.*" events', () => {
      return TestFactory.event_repository._handleEvent({type: ClientEvent.CALL.E_CALL}).then(() => {
        expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(TestFactory.event_repository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('should not save but distribute "conversation.create" events', () => {
      return TestFactory.event_repository._handleEvent({type: BackendEvent.CONVERSATION.CREATE}).then(() => {
        expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(TestFactory.event_repository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.rename" events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T11:57:37.498Z',
        data: {name: 'Renamed'},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '7.800122000b2f7cca',
        type: 'conversation.rename',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      return TestFactory.event_repository._handleEvent(event).then(() => {
        expect(TestFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(TestFactory.event_repository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.member-join" events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T12:01:14.688Z',
        data: {user_ids: ['e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86']},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '8.800122000b2f7d20',
        type: 'conversation.member-join',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      return TestFactory.event_repository._handleEvent(event).then(() => {
        expect(TestFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(TestFactory.event_repository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.member-leave" events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T12:01:56.363Z',
        data: {user_ids: ['e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86']},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '9.800122000b3d69bc',
        type: 'conversation.member-leave',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      return TestFactory.event_repository._handleEvent(event).then(() => {
        expect(TestFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(TestFactory.event_repository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('accepts "conversation.voice-channel-deactivate" (missed call) events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '64dcb45f-bf8d-4eac-a263-649a60d69305',
        time: '2016-08-09T12:09:28.294Z',
        data: {reason: 'missed'},
        from: '0410795a-58dc-40d8-b216-cbc2360be21a',
        id: '16.800122000b3d4ade',
        type: 'conversation.voice-channel-deactivate',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      return TestFactory.event_repository._handleEvent(event).then(() => {
        expect(TestFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(TestFactory.event_repository._distributeEvent).toHaveBeenCalled();
      });
    });

    it('accepts plain decryption error events', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '7f0939c8-dbd9-48f5-839e-b0ebcfffec8c',
        id: 'f518d6ff-19d3-48a0-b0c1-cc71c6e81136',
        type: 'conversation.unable-to-decrypt',
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        time: '2016-08-09T12:58:49.485Z',
        error: 'Offset is outside the bounds of the DataView (17cd13b4b2a3a98)',
        errorCode: '1778 (17cd13b4b2a3a98)',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      return TestFactory.event_repository._handleEvent(event).then(() => {
        expect(TestFactory.event_service.saveEvent).toHaveBeenCalled();
        expect(TestFactory.event_repository._distributeEvent).toHaveBeenCalled();
      });
    });
  });

  describe('processEvent', () => {
    it('processes OTR events', () => {
      const text = 'Hello, this is a test!';
      const ownClientId = 'f180a823bf0d1204';

      TestFactory.client_repository.currentClient(new z.client.ClientEntity({id: ownClientId}));
      TestFactory.cryptography_repository.createCryptobox.and.callThrough();

      return Promise.resolve()
        .then(() => TestFactory.cryptography_repository.createCryptobox(TestFactory.storage_service.db))
        .then(() => TestFactory.cryptography_repository.cryptobox.get_prekey())
        .then(async preKeyBundle => {
          const ciphertext = await createEncodedCiphertext(preKeyBundle, text);
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
          return TestFactory.event_repository.processEvent(event, source);
        })
        .then(messagePayload => {
          expect(messagePayload.data.content).toBe(text);
        });
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

      spyOn(TestFactory.event_service, 'saveEvent').and.callFake(saved_event => Promise.resolve(saved_event));
    });

    it('saves an event with a previously not used ID', () => {
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve());

      return TestFactory.event_repository.processEvent(event).then(() => {
        expect(TestFactory.event_service.saveEvent).toHaveBeenCalled();
      });
    });

    it('ignores an event with an ID previously used by another user', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      previously_stored_event.from = createRandomUuid();
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return TestFactory.event_repository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a non-"text message" with an ID previously used by the same user', () => {
      event.type = ClientEvent.CALL.E_CALL;
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return TestFactory.event_repository
        ._handleEventSaving(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a plain text message with an ID previously used by the same user for a non-"text message"', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      previously_stored_event.type = ClientEvent.CALL.E_CALL;
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return TestFactory.event_repository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a plain text message with an ID previously used by the same user', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return TestFactory.event_repository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message with link preview', () => {
      event.data.previews.push(1);
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      return TestFactory.event_repository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message different content', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));

      event.data.previews.push(1);
      event.data.content = 'Ipsum loren';

      return TestFactory.event_repository
        .processEvent(event)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('saves a text message with link preview with an ID previously used by the same user for a plain text message', () => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(previously_stored_event));
      spyOn(TestFactory.event_service, 'replaceEvent').and.returnValue(Promise.resolve(previously_stored_event));

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      event.data.previews.push(1);
      event.time = changed_time;

      return TestFactory.event_repository.processEvent(event).then(saved_event => {
        expect(saved_event.time).toEqual(initial_time);
        expect(saved_event.time).not.toEqual(changed_time);
        expect(saved_event.primary_key).toEqual(previously_stored_event.primary_key);
        expect(TestFactory.event_service.replaceEvent).toHaveBeenCalled();
      });
    });

    it('ignores edit message with missing associated original message', () => {
      const linkPreviewEvent = JSON.parse(JSON.stringify(event));
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve());
      spyOn(TestFactory.event_service, 'replaceEvent').and.returnValue(Promise.resolve());

      linkPreviewEvent.data.replacing_message_id = 'initial_message_id';

      return TestFactory.event_repository
        ._handleEventSaving(linkPreviewEvent)
        .then(() => fail('Should have thrown an error'))
        .catch(() => {
          expect(TestFactory.event_service.replaceEvent).not.toHaveBeenCalled();
          expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('updates edited messages when link preview arrives', () => {
      const replacingId = 'old-replaced-message-id';
      const storedEvent = Object.assign({}, event, {
        data: Object.assign({}, event.data, {
          replacing_message_id: replacingId,
        }),
      });
      const linkPreviewEvent = Object.assign({}, event);
      spyOn(TestFactory.event_service, 'loadEvent').and.callFake((conversationId, messageId) => {
        return messageId === replacingId ? Promise.resolve() : Promise.resolve(storedEvent);
      });
      spyOn(TestFactory.event_service, 'replaceEvent').and.callFake(ev => ev);

      linkPreviewEvent.data.replacing_message_id = replacingId;
      linkPreviewEvent.data.previews = ['preview'];

      return TestFactory.event_repository._handleEventSaving(linkPreviewEvent).then(updatedEvent => {
        expect(TestFactory.event_service.replaceEvent).toHaveBeenCalled();
        expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(updatedEvent.data.previews[0]).toEqual('preview');
      });
    });

    it('updates edited messages', () => {
      const originalMessage = JSON.parse(JSON.stringify(event));
      originalMessage.reactions = ['user-id'];
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(originalMessage));
      spyOn(TestFactory.event_service, 'replaceEvent').and.callFake(updates => updates);

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      originalMessage.primary_key = 12;
      event.id = createRandomUuid();
      event.data.content = 'new content';
      event.data.replacing_message_id = originalMessage.id;
      event.time = changed_time;

      return TestFactory.event_repository._handleEventSaving(event).then(updatedEvent => {
        expect(updatedEvent.time).toEqual(initial_time);
        expect(updatedEvent.time).not.toEqual(changed_time);
        expect(updatedEvent.data.content).toEqual('new content');
        expect(updatedEvent.primary_key).toEqual(originalMessage.primary_key);
        expect(updatedEvent.reactions).toEqual([]);
        expect(TestFactory.event_service.replaceEvent).toHaveBeenCalled();
      });
    });

    it('updates link preview when edited', () => {
      const replacingId = 'replaced-message-id';
      const storedEvent = Object.assign({}, event, {
        data: Object.assign({}, event.data, {
          previews: ['preview'],
        }),
      });
      const editEvent = Object.assign({}, event);
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(storedEvent));
      spyOn(TestFactory.event_service, 'replaceEvent').and.callFake(ev => ev);

      editEvent.data.replacing_message_id = replacingId;

      return TestFactory.event_repository._handleEventSaving(editEvent).then(updatedEvent => {
        expect(TestFactory.event_service.replaceEvent).toHaveBeenCalled();
        expect(TestFactory.event_service.saveEvent).not.toHaveBeenCalled();
        expect(updatedEvent.data.previews.length).toEqual(0);
      });
    });

    it('saves a conversation.asset-add event', () => {
      const assetAddEvent = Object.assign({}, event, {
        type: ClientEvent.CONVERSATION.ASSET_ADD,
      });

      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve());

      return TestFactory.event_repository.processEvent(assetAddEvent).then(updatedEvent => {
        expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(TestFactory.event_service.saveEvent).toHaveBeenCalled();
      });
    });

    it('deletes cancelled conversation.asset-add event', () => {
      const froms = [
        // cancel from an other user
        'other-user-id',
        // cancel from the self user
        TestFactory.event_repository.userRepository.self().id,
      ];

      const loadEventSpy = spyOn(TestFactory.event_service, 'loadEvent');
      const deleteEventSpy = spyOn(TestFactory.event_service, 'deleteEvent');
      const testPromises = froms.map(from => {
        const assetAddEvent = Object.assign({}, event, {
          from,
          type: ClientEvent.CONVERSATION.ASSET_ADD,
        });
        const assetCancelEvent = Object.assign({}, assetAddEvent, {
          data: {reason: AssetUploadFailedReason.CANCELLED, status: AssetTransferState.UPLOAD_FAILED},
          time: '2017-09-06T09:43:36.528Z',
        });

        loadEventSpy.and.returnValue(Promise.resolve(assetAddEvent));
        deleteEventSpy.and.returnValue(Promise.resolve());

        return TestFactory.event_repository.processEvent(assetCancelEvent).then(savedEvent => {
          expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
          expect(TestFactory.event_service.deleteEvent).toHaveBeenCalled();
        });
      });

      return Promise.all(testPromises);
    });

    it('deletes other user failed upload for conversation.asset-add event', () => {
      const assetAddEvent = Object.assign({}, event, {
        type: ClientEvent.CONVERSATION.ASSET_ADD,
      });
      const assetUploadFailedEvent = Object.assign({}, assetAddEvent, {
        data: {reason: AssetUploadFailedReason.FAILED, status: AssetTransferState.UPLOAD_FAILED},
        time: '2017-09-06T09:43:36.528Z',
      });

      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(assetAddEvent));
      spyOn(TestFactory.event_service, 'deleteEvent').and.returnValue(Promise.resolve());

      return TestFactory.event_repository.processEvent(assetUploadFailedEvent).then(savedEvent => {
        expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(TestFactory.event_service.deleteEvent).toHaveBeenCalled();
      });
    });

    it('updates self failed upload for conversation.asset-add event', () => {
      const assetAddEvent = Object.assign({}, event, {
        type: ClientEvent.CONVERSATION.ASSET_ADD,
      });
      const assetUploadFailedEvent = Object.assign({}, assetAddEvent, {
        data: {reason: AssetUploadFailedReason.FAILED, status: AssetTransferState.UPLOAD_FAILED},
        time: '2017-09-06T09:43:36.528Z',
      });

      spyOn(TestFactory.user_repository, 'self').and.returnValue({id: assetAddEvent.from});
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(assetAddEvent));
      spyOn(TestFactory.event_service, 'updateEventAsUploadFailed').and.returnValue(
        Promise.resolve(assetUploadFailedEvent)
      );

      return TestFactory.event_repository.processEvent(assetUploadFailedEvent).then(savedEvent => {
        expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(TestFactory.event_service.updateEventAsUploadFailed).toHaveBeenCalled();
      });
    });

    it('handles conversation.asset-add state update event', () => {
      const initialAssetEvent = Object.assign({}, event, {
        type: ClientEvent.CONVERSATION.ASSET_ADD,
      });

      const updateStatusEvent = Object.assign({}, initialAssetEvent, {
        data: {status: AssetTransferState.UPLOADED},
        time: '2017-09-06T09:43:36.528Z',
      });

      spyOn(TestFactory.event_service, 'replaceEvent').and.callFake(eventToUpdate => Promise.resolve(eventToUpdate));
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(initialAssetEvent));

      return TestFactory.event_repository.processEvent(updateStatusEvent).then(updatedEvent => {
        expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(updatedEvent.data.status).toEqual(updateStatusEvent.data.status);
        expect(TestFactory.event_service.replaceEvent).toHaveBeenCalled();
      });
    });

    it('updates video when preview is received', () => {
      const initialAssetEvent = Object.assign({}, event, {
        type: ClientEvent.CONVERSATION.ASSET_ADD,
      });

      const AssetPreviewEvent = Object.assign({}, initialAssetEvent, {
        data: {status: AssetTransferState.UPLOADED},
        time: '2017-09-06T09:43:36.528Z',
      });

      spyOn(TestFactory.event_service, 'replaceEvent').and.callFake(eventToUpdate => Promise.resolve(eventToUpdate));
      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(initialAssetEvent));

      return TestFactory.event_repository.processEvent(AssetPreviewEvent).then(updatedEvent => {
        expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(updatedEvent.data.preview_key).toEqual(AssetPreviewEvent.data.preview_key);
        expect(TestFactory.event_service.replaceEvent).toHaveBeenCalled();
      });
    });
  });

  describe('_handleEventValidation', () => {
    it('ignores "conversation.typing" events', () => {
      TestFactory.event_repository
        ._handleEventValidation({type: BackendEvent.CONVERSATION.TYPING})
        .then(fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
        });
    });

    it('skips outdated events arriving via notification stream', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {
        conversation: '9fe8b359-b9e0-4624-b63c-71747664e4fa',
        time: '2016-08-05T16:18:41.820Z',
        data: {content: 'Hello', nonce: '1cea64c5-afbe-4c9d-b7d0-c49aa3b0a53d'},
        from: '532af01e-1e24-4366-aacf-33b67d4ee376',
        id: '74f.800122000b2d7182',
        type: 'conversation.message-add',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */
      TestFactory.event_repository.lastEventDate('2017-08-05T16:18:41.820Z');

      TestFactory.event_repository
        ._handleEventValidation(event, EventRepository.SOURCE.STREAM)
        .then(() => fail('Method should have thrown an error'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.error.EventError));
          expect(error.type).toBe(z.error.EventError.TYPE.VALIDATION_FAILED);
        });
    });
  });
});
