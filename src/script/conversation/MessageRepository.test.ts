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
import {CONVERSATION_TYPE} from '@wireapp/api-client/src/conversation/';
import {GenericMessage, LegalHoldStatus, Text} from '@wireapp/protocol-messaging';
import * as sinon from 'sinon';
import {createRandomUuid} from 'Util/util';
import {TestFactory} from '../../../test/helper/TestFactory';
import {GENERIC_MESSAGE_TYPE} from 'src/script/cryptography/GenericMessageType';
import {EventInfoEntity} from 'src/script/conversation/EventInfoEntity';
import {ConversationMapper} from 'src/script/conversation/ConversationMapper';
import {Conversation} from 'src/script/entity/Conversation';
import {ConnectionEntity} from 'src/script/connection/ConnectionEntity';
import {User} from 'src/script/entity/User';
import {Message} from 'src/script/entity/message/Message';
import {ConversationError} from 'src/script/error/ConversationError';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {ClientRepository} from '../client/ClientRepository';
import {ConversationRepository} from './ConversationRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {EventRepository} from '../event/EventRepository';
import {MessageSender} from '../message/MessageSender';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {ServerTimeHandler} from '../time/serverTimeHandler';
import {UserRepository} from '../user/UserRepository';
import {AssetRepository} from '../assets/AssetRepository';
import {UserState} from '../user/UserState';
import {TeamState} from '../team/TeamState';
import {ClientState} from '../client/ClientState';
import {ConversationState} from './ConversationState';
import {ConversationService} from './ConversationService';
import {EventService} from '../event/EventService';
import {Core} from '../service/CoreSingleton';
import {container} from 'tsyringe';
import {ClientEntity} from '../client/ClientEntity';

describe('MessageRepository', () => {
  const testFactory = new TestFactory();

  let server: sinon.SinonFakeServer;
  let core: Core;

  const generateConversation = (
    conversation_type = CONVERSATION_TYPE.REGULAR,
    connection_status = ConnectionStatus.ACCEPTED,
  ) => {
    const conversation = new Conversation(createRandomUuid());
    conversation.type(conversation_type);

    const connectionEntity = new ConnectionEntity();
    connectionEntity.conversationId = conversation.qualifiedId;
    connectionEntity.status(connection_status);
    conversation.connection(connectionEntity);
    conversation.legalHoldStatus(LegalHoldStatus.DISABLED);

    const selfUser = new User('selfid');
    selfUser.isMe = true;
    conversation.selfUser(selfUser);

    return conversation;
  };

  beforeEach(() => {
    core = container.resolve(Core);
    core.initServices({} as any);
    server = sinon.fakeServer.create();
    server.autoRespond = true;

    return testFactory.exposeConversationActors();
  });

  afterEach(() => {
    server.restore();
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
            domain: '',
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
      const eventInfoEntity = new EventInfoEntity(genericMessage, {domain: '', id: largeConversationEntity.id});

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
          domain: '',
          id: '0',
        },
        {
          domain: '',
          id: '1',
        },
      ]);

      const genericMessage = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: 'Test'}),
        messageId: createRandomUuid(),
      });
      const eventInfoEntity = new EventInfoEntity(genericMessage, {domain: '', id: smallConversationEntity.id});

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
    beforeEach(() => {
      spyOn(core.service!.conversation, 'deleteMessageEveryone');
    });

    it('should not delete other users messages', async () => {
      const conversationEntity = generateConversation(CONVERSATION_TYPE.REGULAR);

      const user_et = new User('', '');
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
        {} as AssetRepository,
        userState,
        teamState,
        conversationState,
        clientState,
        core,
      );

      await expect(
        messageRepository.deleteMessageForEveryone(conversationEntity, message_to_delete_et),
      ).rejects.toMatchObject({
        type: ConversationError.TYPE.WRONG_USER,
      });
      expect(core.service!.conversation.deleteMessageEveryone).not.toHaveBeenCalled();
    });

    it('should send delete and deletes message for own messages', async () => {
      const conversation = generateConversation(CONVERSATION_TYPE.REGULAR);

      const user = new User('user1');

      const messageToDelete = new Message();
      messageToDelete.id = createRandomUuid();
      messageToDelete.user(conversation.selfUser());

      conversation.participating_user_ets.push(user);

      conversation.addMessage(messageToDelete);

      const userState = new UserState();
      const teamState = new TeamState(userState);
      const conversationState = new ConversationState(userState, teamState);
      const clientState = new ClientState();

      const conversationRepository = {
        getConversationById: jest.fn().mockImplementation(async () => conversation),
      };

      const eventService = {
        deleteEvent: jest.fn(),
      };

      const messageSender = new MessageSender();

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
        {} as AssetRepository,
        userState,
        teamState,
        conversationState,
        clientState,
        core,
      );

      await messageRepository.deleteMessageForEveryone(conversation, messageToDelete);
      expect(core.service!.conversation.deleteMessageEveryone).toHaveBeenCalledWith(
        conversation.id,
        messageToDelete.id,
        ['selfid', 'user1'],
        true,
        undefined,
      );
      expect(eventService.deleteEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetSession', () => {
    let messageRepository: MessageRepository;
    let cryptographyRepository: CryptographyRepository;
    beforeEach(() => {
      const userState = new UserState();
      userState.self(new User('', ''));
      const teamState = new TeamState(userState);
      const conversationState = new ConversationState(userState, teamState);
      const clientState = new ClientState();
      clientState.currentClient(new ClientEntity(true, ''));
      cryptographyRepository = testFactory.cryptography_repository as CryptographyRepository;
      messageRepository = new MessageRepository(
        {} as ClientRepository,
        () => ({} as ConversationRepository),
        cryptographyRepository,
        {} as EventRepository,
        {} as MessageSender,
        {} as PropertiesRepository,
        {} as ServerTimeHandler,
        {} as UserRepository,
        {} as ConversationService,
        {} as AssetRepository,
        userState,
        teamState,
        conversationState,
        clientState,
        core,
      );
    });

    it('resets the session with another device', async () => {
      spyOn(core.service!.conversation, 'send');
      spyOn(cryptographyRepository, 'deleteSession');
      const conversation = generateConversation();

      const userId = {domain: 'domain1', id: 'user1'};
      const clientId = 'client1';
      await messageRepository.resetSession(userId, clientId, conversation);
      expect(cryptographyRepository.deleteSession).toHaveBeenCalledWith(userId, clientId);
      expect(core.service!.conversation.send).toHaveBeenCalled();
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
        {domain: '', id: '3da298fd-0ed4-4e51-863c-bfd2f5b9089b'},
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
