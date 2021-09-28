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

import {ConnectionStatus} from '@wireapp/api-client/src/connection/';
import {CONVERSATION_ACCESS, CONVERSATION_ACCESS_ROLE, CONVERSATION_TYPE} from '@wireapp/api-client/src/conversation/';
import {GenericMessage, LegalHoldStatus, Text} from '@wireapp/protocol-messaging';
import {PublicClient, ClientClassification} from '@wireapp/api-client/src/client/';
import * as sinon from 'sinon';
import {RECEIPT_MODE} from '@wireapp/api-client/src/conversation/data';
import {createRandomUuid} from 'Util/util';
import {TestFactory} from '../../../test/helper/TestFactory';
import {UserGenerator} from '../../../test/helper/UserGenerator';
import {GENERIC_MESSAGE_TYPE} from 'src/script/cryptography/GenericMessageType';
import {EventInfoEntity} from 'src/script/conversation/EventInfoEntity';
import {NOTIFICATION_STATE} from 'src/script/conversation/NotificationSetting';
import {ConversationVerificationState} from 'src/script/conversation/ConversationVerificationState';
import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import {ConversationDatabaseData, ConversationMapper} from 'src/script/conversation/ConversationMapper';
import {ConversationStatus} from 'src/script/conversation/ConversationStatus';
import {ClientEvent} from 'src/script/event/Client';
import {Conversation} from 'src/script/entity/Conversation';
import {ConnectionEntity} from 'src/script/connection/ConnectionEntity';
import {FileAsset} from 'src/script/entity/message/FileAsset';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {User} from 'src/script/entity/User';
import {Message} from 'src/script/entity/message/Message';
import {ConversationError} from 'src/script/error/ConversationError';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {AssetAddEvent} from 'src/script/conversation/EventBuilder';
import {ClientRepository} from '../client/ClientRepository';
import {ConversationRepository} from './ConversationRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {EventRepository} from '../event/EventRepository';
import {MessageSender} from '../message/MessageSender';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {ServerTimeHandler} from '../time/serverTimeHandler';
import {UserRepository} from '../user/UserRepository';
import {LinkPreviewRepository} from '../links/LinkPreviewRepository';
import {AssetRepository} from '../assets/AssetRepository';
import {UserState} from '../user/UserState';
import {TeamState} from '../team/TeamState';
import {ClientState} from '../client/ClientState';
import {ConversationState} from './ConversationState';
import {ConversationService} from './ConversationService';
import {EventService} from '../event/EventService';

describe('MessageRepository', () => {
  const testFactory = new TestFactory();

  let server: sinon.SinonFakeServer;

  const generateConversation = (
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

    return testFactory.exposeConversationActors();
  });

  afterEach(() => {
    server.restore();
  });

  describe('asset upload', () => {
    it('should update original asset when asset upload is complete', async () => {
      const conversationEntity = generateConversation(CONVERSATION_TYPE.REGULAR);

      const fileAssetEntity = new FileAsset();
      fileAssetEntity.status(AssetTransferState.UPLOADING);

      const messageEntity = new ContentMessage(createRandomUuid());
      messageEntity.assets.push(fileAssetEntity);
      conversationEntity.addMessage(messageEntity);

      const event: Partial<AssetAddEvent> = {
        conversation: conversationEntity.id,
        data: {
          id: createRandomUuid(),
          otr_key: new Uint8Array([]),
          sha256: new Uint8Array([]),
        },
        from: createRandomUuid(),
        id: messageEntity.id,
        time: new Date().toISOString(),
        type: ClientEvent.CONVERSATION.ASSET_ADD,
      };

      const userState = new UserState();
      const teamState = new TeamState(userState);
      const conversationState = new ConversationState(userState, teamState);
      const clientState = new ClientState();

      const eventService = {
        updateEventAsUploadSucceeded: jest.fn(),
      };

      const messageRepository = new MessageRepository(
        {} as ClientRepository,
        () => ({} as ConversationRepository),
        {} as CryptographyRepository,
        {
          eventService: eventService as unknown as EventService,
        } as EventRepository,
        {} as MessageSender,
        {} as PropertiesRepository,
        {} as ServerTimeHandler,
        {} as UserRepository,
        {} as ConversationService,
        {} as LinkPreviewRepository,
        {} as AssetRepository,
        userState,
        teamState,
        conversationState,
        clientState,
      );

      await messageRepository['onAssetUploadComplete'](conversationEntity, event as AssetAddEvent);

      expect(eventService.updateEventAsUploadSucceeded).toHaveBeenCalled();

      const firstAsset = messageEntity.assets()[0] as FileAsset;

      expect(firstAsset.original_resource().otrKey).toBe(event.data.otr_key);
      expect(firstAsset.original_resource().sha256).toBe(event.data.sha256);
      expect(firstAsset.status()).toBe(AssetTransferState.UPLOADED);
    });
  });

  describe('sendTextWithLinkPreview', () => {
    it.skip('sends ephemeral message (within the range [1 second, 1 year])', async () => {
      const conversation = generateConversation();
      testFactory.conversation_repository['conversationState'].conversations([conversation]);

      const inBoundValues = [1000, 5000, 12341234, 31536000000];
      const outOfBoundValues = [1, 999, 31536000001, 31557600000];
      const expectedValues = inBoundValues
        .map(val => val.toString())
        .concat(['1000', '1000', '31536000000', '31536000000']);

      spyOn(testFactory.message_repository, 'getMessageInConversationById').and.returnValue(
        Promise.resolve(new Message()),
      );
      spyOn(testFactory.conversation_service, 'postEncryptedMessage').and.returnValue(Promise.resolve({}));
      spyOn(ConversationMapper, 'mapConversations').and.returnValue(Promise.resolve(conversation));
      spyOn<any>(testFactory.conversation_repository, 'fetchConversationById').and.returnValue(
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
        conversation.selfUser(new User(createRandomUuid(), null));
        const messageText = 'hello there';
        return testFactory.message_repository.sendTextWithLinkPreview(conversation, messageText, []);
      });
      const sentMessages = await Promise.all(sentPromises);
      expect(testFactory.conversation_service.postEncryptedMessage).toHaveBeenCalledTimes(sentMessages.length * 2);
    });
  });

  describe('shouldSendAsExternal', () => {
    it('should return true for big payload', async () => {
      const largeConversationEntity = generateConversation();
      largeConversationEntity.participating_user_ids(
        Array(128)
          .fill(undefined)
          .map((x, i) => ({
            domain: null,
            id: i.toString(),
          })),
      );

      const text = new Text({
        content:
          'massive external message massive external message massive external message massive external message ' +
          'massive external message massive external message massive external message massive external message ' +
          'massive external message massive external message massive external message massive external message ' +
          'massive external message massive external message massive external message massive external message ' +
          'massive external message massive external message massive external message massive external message ' +
          'massive external message massive external message massive external message massive external message ' +
          'massive external message massive external message massive external message massive external message ' +
          'massive external message massive external message massive external message massive external message ' +
          'massive external message massive external message massive external message massive external message',
      });
      const genericMessage = new GenericMessage({[GENERIC_MESSAGE_TYPE.TEXT]: text, messageId: createRandomUuid()});
      const eventInfoEntity = new EventInfoEntity(genericMessage, {domain: null, id: largeConversationEntity.id});

      const userState = new UserState();
      const teamState = new TeamState(userState);
      const conversationState = new ConversationState(userState, teamState);
      const clientState = new ClientState();

      const conversationRepository = {
        getConversationById: jest.fn().mockImplementation(() => largeConversationEntity),
      };

      const messageRepository = new MessageRepository(
        {} as ClientRepository,
        () => conversationRepository as unknown as ConversationRepository,
        {} as CryptographyRepository,
        {} as EventRepository,
        {} as MessageSender,
        {} as PropertiesRepository,
        {} as ServerTimeHandler,
        {} as UserRepository,
        {} as ConversationService,
        {} as LinkPreviewRepository,
        {} as AssetRepository,
        userState,
        teamState,
        conversationState,
        clientState,
      );

      const shouldSendAsExternal = await messageRepository['shouldSendAsExternal'](eventInfoEntity);
      expect(conversationRepository.getConversationById).toHaveBeenCalled();
      expect(shouldSendAsExternal).toBeTruthy();
    });

    it('should return false for small payload', async () => {
      const smallConversationEntity = generateConversation();
      smallConversationEntity.participating_user_ids([
        {
          domain: null,
          id: '0',
        },
        {
          domain: null,
          id: '1',
        },
      ]);

      const genericMessage = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: 'Test'}),
        messageId: createRandomUuid(),
      });
      const eventInfoEntity = new EventInfoEntity(genericMessage, {domain: null, id: smallConversationEntity.id});

      const userState = new UserState();
      const teamState = new TeamState(userState);
      const conversationState = new ConversationState(userState, teamState);
      const clientState = new ClientState();

      const conversationRepository = {
        getConversationById: jest.fn().mockImplementation(async () => smallConversationEntity),
      };

      const messageRepository = new MessageRepository(
        {} as ClientRepository,
        () => conversationRepository as unknown as ConversationRepository,
        {} as CryptographyRepository,
        {} as EventRepository,
        {} as MessageSender,
        {} as PropertiesRepository,
        {} as ServerTimeHandler,
        {} as UserRepository,
        {} as ConversationService,
        {} as LinkPreviewRepository,
        {} as AssetRepository,
        userState,
        teamState,
        conversationState,
        clientState,
      );

      const shouldSendAsExternal = await messageRepository['shouldSendAsExternal'](eventInfoEntity);
      expect(conversationRepository.getConversationById).toHaveBeenCalled();
      expect(shouldSendAsExternal).toBeFalsy();
    });
  });

  describe('deleteMessageForEveryone', () => {
    it('should not delete other users messages', async () => {
      const conversationEntity = generateConversation(CONVERSATION_TYPE.REGULAR);

      const user_et = new User('', null);
      user_et.isMe = false;

      const message_to_delete_et = new Message(createRandomUuid());
      message_to_delete_et.user(user_et);

      conversationEntity.addMessage(message_to_delete_et);

      const userState = new UserState();
      const teamState = new TeamState(userState);
      const conversationState = new ConversationState(userState, teamState);
      const clientState = new ClientState();

      const messageRepository = new MessageRepository(
        {} as ClientRepository,
        () => ({} as ConversationRepository),
        {} as CryptographyRepository,
        {} as EventRepository,
        {} as MessageSender,
        {} as PropertiesRepository,
        {} as ServerTimeHandler,
        {} as UserRepository,
        {} as ConversationService,
        {} as LinkPreviewRepository,
        {} as AssetRepository,
        userState,
        teamState,
        conversationState,
        clientState,
      );

      spyOn<any>(messageRepository, 'sendGenericMessage').and.returnValue(Promise.resolve());

      await expect(
        messageRepository.deleteMessageForEveryone(conversationEntity, message_to_delete_et),
      ).rejects.toMatchObject({
        type: ConversationError.TYPE.WRONG_USER,
      });
      expect(messageRepository['sendGenericMessage']).not.toHaveBeenCalled();
    });

    it('should send delete and deletes message for own messages', async () => {
      const conversationEntity = generateConversation(CONVERSATION_TYPE.REGULAR);

      const userEntity = new User('', null);
      userEntity.isMe = true;

      const messageEntityToDelete = new Message();
      messageEntityToDelete.id = createRandomUuid();
      messageEntityToDelete.user(userEntity);

      conversationEntity.addMessage(messageEntityToDelete);

      const userState = new UserState();
      const teamState = new TeamState(userState);
      const conversationState = new ConversationState(userState, teamState);
      const clientState = new ClientState();

      const conversationRepository = {
        getConversationById: jest.fn().mockImplementation(async () => conversationEntity),
      };

      const eventService = {
        deleteEvent: jest.fn(),
      };

      const messageSender = new MessageSender();
      messageSender.pauseQueue(false);

      const messageRepository = new MessageRepository(
        {} as ClientRepository,
        () => conversationRepository as unknown as ConversationRepository,
        {} as CryptographyRepository,
        {eventService: eventService as unknown as EventService} as EventRepository,
        messageSender,
        {} as PropertiesRepository,
        {} as ServerTimeHandler,
        {} as UserRepository,
        {} as ConversationService,
        {} as LinkPreviewRepository,
        {} as AssetRepository,
        userState,
        teamState,
        conversationState,
        clientState,
      );

      spyOn<any>(messageRepository, 'sendGenericMessage').and.returnValue(Promise.resolve());
      spyOn(messageRepository, 'createRecipients').and.returnValue(Promise.resolve());
      spyOn(userState, 'self').and.returnValue(userEntity);

      await messageRepository.deleteMessageForEveryone(conversationEntity, messageEntityToDelete);
      expect(messageRepository['sendGenericMessage']).toHaveBeenCalled();
      expect(messageRepository.createRecipients).toHaveBeenCalled();
      expect(eventService.deleteEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateAllClients', () => {
    it(`updates a conversation's legal hold status when it discovers during message sending that a legal hold client got removed from a participant`, async () => {
      const selfUser = UserGenerator.getRandomUser();
      const conversationPartner = UserGenerator.getRandomUser();
      testFactory.user_repository['userState'].users.push(conversationPartner);

      spyOn(testFactory.user_repository['userState'], 'self').and.returnValue(selfUser);

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
        receipt_mode: RECEIPT_MODE.ON,
        status: ConversationStatus.CURRENT_MEMBER,
        team_id: createRandomUuid(),
        type: CONVERSATION_TYPE.REGULAR,
        verification_state: ConversationVerificationState.UNVERIFIED,
      } as ConversationDatabaseData;

      const clientsPayload: PublicClient[] = [
        {
          class: ClientClassification.DESKTOP,
          id: '1e66e04948938c2c',
        },
        {
          class: ClientClassification.LEGAL_HOLD,
          id: '53761bec3f10a6d9',
        },
        {
          class: ClientClassification.DESKTOP,
          id: 'a9c8c385737b14fe',
        },
      ];

      for (const clientPayload of clientsPayload) {
        const wasClientAdded = await testFactory.user_repository.addClientToUser(
          conversationPartner.id,
          clientPayload,
          false,
          conversationPartner.domain,
        );

        expect(wasClientAdded).toBe(true);
      }

      const conversationEntity = ConversationMapper.mapConversations([conversationJsonFromDb])[0];
      conversationEntity.participating_user_ets.push(conversationPartner);
      conversationEntity.selfUser(selfUser);

      // Legal hold status is "on" because our conversation partner has a legal hold client
      expect(conversationEntity.hasLegalHold()).toBe(true);

      await testFactory.conversation_repository['saveConversation'](conversationEntity);

      spyOn(testFactory.conversation_service, 'postEncryptedMessage').and.returnValue(
        Promise.reject({
          deleted: {
            // Legal hold client got removed
            [conversationPartner.id]: ['53761bec3f10a6d9'],
          },
          missing: {},
          redundant: {},
          time: new Date().toISOString(),
        }),
      );

      spyOn(testFactory.client_repository, 'removeClient').and.returnValue(Promise.resolve());

      // Start client discovery of conversation participants
      await testFactory.message_repository.updateAllClients(conversationEntity, true);

      expect(conversationEntity.hasLegalHold()).toBe(false);
    });
  });

  describe('getOtherUsersWithoutClients', () => {
    it('returns a list of user ids (excluding ourselves) for which we need to fetch client information', () => {
      const genericMessage = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: new Text({
          content: 'Hello, World!',
        }),
        messageId: createRandomUuid(),
      });

      const selfUserId = 'ce1a2792-fb51-4977-a8e5-7a1dd8f2bb0b';
      const otherUserId = '6f88716b-1383-44da-9d57-45b51cc64d90';

      const eventInfoEntity = new EventInfoEntity(
        genericMessage,
        {domain: null, id: '3da298fd-0ed4-4e51-863c-bfd2f5b9089b'},
        {
          nativePush: true,
          precondition: false,
          recipients: {[otherUserId]: [], [selfUserId]: []},
        },
      );

      const userIdsWithoutClients = MessageRepository.getOtherUsersWithoutClients(eventInfoEntity, selfUserId);
      expect(userIdsWithoutClients.length).toBe(1);
      expect(userIdsWithoutClients[0]).toBe('6f88716b-1383-44da-9d57-45b51cc64d90');
    });
  });
});
