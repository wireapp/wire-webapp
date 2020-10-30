/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {ConnectionStatus} from '@wireapp/api-client/src/connection';
import {createRandomUuid} from 'Util/util';
import {TestFactory} from '../../helper/TestFactory';
import {CONVERSATION_ACCESS, CONVERSATION_ACCESS_ROLE} from '@wireapp/api-client/src/conversation';
import {Confirmation, GenericMessage, LegalHoldStatus, Text} from '@wireapp/protocol-messaging';
import {GENERIC_MESSAGE_TYPE} from 'src/script/cryptography/GenericMessageType';
import {EventInfoEntity} from 'src/script/conversation/EventInfoEntity';
import {NOTIFICATION_STATE} from 'src/script/conversation/NotificationSetting';
import {ConversationVerificationState} from 'src/script/conversation/ConversationVerificationState';
import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import {CONVERSATION_TYPE} from '@wireapp/api-client/src/conversation';
import {ConversationMapper} from 'src/script/conversation/ConversationMapper';
import {ConversationStatus} from 'src/script/conversation/ConversationStatus';
import {UserGenerator} from '../../helper/UserGenerator';
import {NOTIFICATION_HANDLING_STATE} from 'src/script/event/NotificationHandlingState';
import {WebAppEvents} from '@wireapp/webapp-events';
import {ClientEvent} from 'src/script/event/Client';
import {Conversation} from 'src/script/entity/Conversation';
import {ConnectionEntity} from 'src/script/connection/ConnectionEntity';
import {FileAsset} from 'src/script/entity/message/FileAsset';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {User} from 'src/script/entity/User';
import {Message} from 'src/script/entity/message/Message';
import {ConversationError} from 'src/script/error/ConversationError';

describe('MessageRepository', () => {
  const testFactory = new TestFactory();

  let server = null;

  const generate_conversation = (
    conversation_type = CONVERSATION_TYPE.REGULAR,
    connection_status = ConnectionStatus.ACCEPTED,
  ) => {
    const conversation = new Conversation(createRandomUuid());
    conversation.type(conversation_type);

    const connectionEntity = new ConnectionEntity();
    connectionEntity.conversationId = conversation.id;
    connectionEntity.status(connection_status);
    conversation.connection(connectionEntity);
    conversation.legalHoldStatus(LegalHoldStatus.DISABLED);

    return conversation;
  };

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.autoRespond = true;
    sinon.spy(jQuery, 'ajax');

    return testFactory.exposeConversationActors().then(conversation_repository => {
      amplify.publish(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
    });
  });

  afterEach(() => {
    server.restore();
    jQuery.ajax.restore();
  });

  describe('asset upload', () => {
    let messageEntity = null;
    let conversationEntity = null;

    beforeEach(() => {
      conversationEntity = generate_conversation(CONVERSATION_TYPE.REGULAR);

      return testFactory.conversation_repository.saveConversation(conversationEntity).then(() => {
        const file_et = new FileAsset();
        file_et.status(AssetTransferState.UPLOADING);
        messageEntity = new ContentMessage(createRandomUuid());
        messageEntity.assets.push(file_et);
        conversationEntity.add_message(messageEntity);

        spyOn(testFactory.event_service, 'updateEventAsUploadSucceeded');
        spyOn(testFactory.event_service, 'updateEventAsUploadFailed');
        spyOn(testFactory.event_service, 'deleteEvent');
      });
    });

    afterEach(() => conversationEntity.remove_messages());

    it('should update original asset when asset upload is complete', () => {
      const event = {
        conversation: conversationEntity.id,
        data: {
          id: createRandomUuid(),
          otr_key: new Uint8Array([]),
          sha256: new Uint8Array([]),
        },
        from: createRandomUuid(),
        id: messageEntity.id,
        time: Date.now(),
        type: ClientEvent.CONVERSATION.ASSET_ADD,
      };

      return testFactory.message_repository.onAssetUploadComplete(conversationEntity, event).then(() => {
        expect(testFactory.event_service.updateEventAsUploadSucceeded).toHaveBeenCalled();

        const [firstAsset] = messageEntity.assets();

        expect(firstAsset.original_resource().otrKey).toBe(event.data.otr_key);
        expect(firstAsset.original_resource().sha256).toBe(event.data.sha256);
        expect(firstAsset.status()).toBe(AssetTransferState.UPLOADED);
      });
    });
  });

  describe('sendTextWithLinkPreview', () => {
    xit('sends ephemeral message (within the range [1 second, 1 year])', async () => {
      const conversation = generate_conversation();
      testFactory.conversation_repository.conversationState.conversations([conversation]);

      const inBoundValues = [1000, 5000, 12341234, 31536000000];
      const outOfBoundValues = [1, 999, 31536000001, 31557600000];
      const expectedValues = inBoundValues
        .map(val => val.toString())
        .concat(['1000', '1000', '31536000000', '31536000000']);

      spyOn(testFactory.message_repository, 'getMessageInConversationById').and.returnValue(
        Promise.resolve(new Message()),
      );
      spyOn(testFactory.conversation_service, 'post_encrypted_message').and.returnValue(Promise.resolve({}));
      spyOn(testFactory.conversation_repository.conversationMapper, 'mapConversations').and.returnValue(
        Promise.resolve(conversation),
      );
      spyOn(testFactory.conversation_repository, 'fetchConversationById').and.returnValue(
        Promise.resolve(conversation),
      );
      spyOn(testFactory.cryptography_repository, 'encryptGenericMessage').and.callFake(
        (conversationId, genericMessage) => {
          const {content, ephemeral} = genericMessage;

          expect(content).toBe(GENERIC_MESSAGE_TYPE.EPHEMERAL);
          expect(ephemeral.content).toBe(GENERIC_MESSAGE_TYPE.TEXT);
          expect(ephemeral.expireAfterMillis.toString()).toBe(expectedValues.shift());
          return Promise.resolve({
            recipients: {},
          });
        },
      );

      const sentPromises = inBoundValues.concat(outOfBoundValues).map(expiration => {
        conversation.localMessageTimer(expiration);
        conversation.selfUser(new User(createRandomUuid()));
        const messageText = 'hello there';
        return testFactory.message_repository.sendTextWithLinkPreview(conversation, messageText);
      });
      const sentMessages = await Promise.all(sentPromises);
      expect(testFactory.conversation_service.post_encrypted_message).toHaveBeenCalledTimes(sentMessages.length * 2);
    });
  });

  describe('shouldSendAsExternal', () => {
    it('should return true for big payload', () => {
      const largeConversationEntity = generate_conversation();
      largeConversationEntity.participating_user_ids(
        Array(128)
          .fill()
          .map((x, i) => i),
      );

      return testFactory.conversation_repository
        .saveConversation(largeConversationEntity)
        .then(() => {
          const text = new Text({
            content:
              'massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message',
          });
          const genericMessage = new GenericMessage({
            [GENERIC_MESSAGE_TYPE.TEXT]: text,
            messageId: createRandomUuid(),
          });

          const eventInfoEntity = new EventInfoEntity(genericMessage, largeConversationEntity.id);
          return testFactory.message_repository.shouldSendAsExternal(eventInfoEntity);
        })
        .then(shouldSendAsExternal => {
          expect(shouldSendAsExternal).toBeTruthy();
        });
    });

    it('should return false for small payload', () => {
      const smallConversationEntity = generate_conversation();
      smallConversationEntity.participating_user_ids([0, 1]);

      return testFactory.conversation_repository
        .saveConversation(smallConversationEntity)
        .then(() => {
          const genericMessage = new GenericMessage({
            [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: 'Test'}),
            messageId: createRandomUuid(),
          });

          const eventInfoEntity = new EventInfoEntity(genericMessage, smallConversationEntity.id);
          return testFactory.message_repository.shouldSendAsExternal(eventInfoEntity);
        })
        .then(shouldSendAsExternal => {
          expect(shouldSendAsExternal).toBeFalsy();
        });
    });
  });

  describe('deleteMessageForEveryone', () => {
    let conversationEntity = null;
    beforeEach(() => {
      conversationEntity = generate_conversation(CONVERSATION_TYPE.REGULAR);
      spyOn(testFactory.message_repository, 'sendGenericMessage').and.returnValue(Promise.resolve());
    });

    it('should not delete other users messages', done => {
      const user_et = new User();
      user_et.isMe = false;
      const message_to_delete_et = new Message(createRandomUuid());
      message_to_delete_et.user(user_et);
      conversationEntity.add_message(message_to_delete_et);

      testFactory.message_repository
        .deleteMessageForEveryone(conversationEntity, message_to_delete_et)
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(ConversationError));
          expect(error.type).toBe(ConversationError.TYPE.WRONG_USER);
          done();
        });
    });

    it('should send delete and deletes message for own messages', () => {
      spyOn(testFactory.event_service, 'deleteEvent');
      const userEntity = new User();
      userEntity.isMe = true;
      const messageEntityToDelete = new Message();
      messageEntityToDelete.id = createRandomUuid();
      messageEntityToDelete.user(userEntity);
      conversationEntity.add_message(messageEntityToDelete);

      spyOn(testFactory.user_repository.userState, 'self').and.returnValue(userEntity);
      spyOn(testFactory.conversation_repository, 'get_conversation_by_id').and.returnValue(
        Promise.resolve(conversationEntity),
      );

      return testFactory.message_repository
        .deleteMessageForEveryone(conversationEntity, messageEntityToDelete)
        .then(() => {
          expect(testFactory.event_service.deleteEvent).toHaveBeenCalledTimes(1);
        });
    });
  });

  describe('updateAllClients', () => {
    it(`updates a conversation's legal hold status when it discovers during message sending that a legal hold client got removed from a participant`, async () => {
      const selfUser = UserGenerator.getRandomUser();
      const conversationPartner = UserGenerator.getRandomUser();
      testFactory.user_repository.userState.users.push(conversationPartner);

      spyOn(testFactory.user_repository.userState, 'self').and.returnValue(selfUser);

      const conversationJsonFromDb = {
        accessModes: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE],
        accessRole: CONVERSATION_ACCESS_ROLE.NON_ACTIVATED,
        archived_state: false,
        archived_timestamp: 0,
        cleared_timestamp: 0,
        creator: conversationPartner.id,
        ephemeral_timer: null,
        global_message_timer: null,
        id: createRandomUuid(),
        is_guest: false,
        is_managed: false,
        last_event_timestamp: 1563965225224,
        last_read_timestamp: 1563965225224,
        last_server_timestamp: 1563965229043,
        legal_hold_status: LegalHoldStatus.ENABLED,
        message_timer: null,
        muted_state: NOTIFICATION_STATE.MENTIONS_AND_REPLIES,
        muted_timestamp: 0,
        name: 'Test Group',
        others: [conversationPartner.id],
        receipt_mode: Confirmation.Type.READ,
        status: ConversationStatus.CURRENT_MEMBER,
        team_id: createRandomUuid(),
        type: CONVERSATION_TYPE.REGULAR,
        verification_state: ConversationVerificationState.UNVERIFIED,
      };

      const clientsPayload = [
        {
          class: 'desktop',
          id: '1e66e04948938c2c',
        },
        {
          class: 'legalhold',
          id: '53761bec3f10a6d9',
        },
        {
          class: 'desktop',
          id: 'a9c8c385737b14fe',
        },
      ];

      for (const clientPayload of clientsPayload) {
        const wasClientAdded = await testFactory.user_repository.addClientToUser(
          conversationPartner.id,
          clientPayload,
          false,
        );

        expect(wasClientAdded).toBe(true);
      }

      const conversationEntity = new ConversationMapper().mapConversations([conversationJsonFromDb])[0];
      conversationEntity.participating_user_ets.push(conversationPartner);
      conversationEntity.selfUser(selfUser);

      // Legal hold status is "on" because our conversation partner has a legal hold client
      expect(conversationEntity.hasLegalHold()).toBe(true);

      await testFactory.conversation_repository.saveConversation(conversationEntity);

      const missingClientsError = new Error();
      missingClientsError.deleted = {
        // Legal hold client got removed
        [conversationPartner.id]: ['53761bec3f10a6d9'],
      };
      missingClientsError.missing = {};
      missingClientsError.redundant = {};
      missingClientsError.time = new Date().toISOString();

      spyOn(testFactory.conversation_service, 'post_encrypted_message').and.returnValue(
        Promise.reject(missingClientsError),
      );

      spyOn(testFactory.client_repository, 'removeClient').and.returnValue(Promise.resolve());

      // Start client discovery of conversation participants
      await testFactory.message_repository.updateAllClients(conversationEntity);

      expect(conversationEntity.hasLegalHold()).toBe(false);
    });
  });
});
