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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation/';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation/NewConversation';
import {MessageSendingState} from '@wireapp/core/lib/conversation';

import {Account} from '@wireapp/core';
import {LegalHoldStatus} from '@wireapp/protocol-messaging';

import {ConnectionEntity} from 'src/script/connection/ConnectionEntity';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {Message} from 'src/script/entity/message/Message';
import {Text} from 'src/script/entity/message/Text';
import {User} from 'src/script/entity/User';
import {ConversationError} from 'src/script/error/ConversationError';
import {createRandomUuid} from 'Util/util';

import {ConversationRepository} from './ConversationRepository';
import {ConversationState} from './ConversationState';

import {AssetRepository} from '../assets/AssetRepository';
import {ClientEntity} from '../client/ClientEntity';
import {ClientState} from '../client/ClientState';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {ContentMessage} from '../entity/message/ContentMessage';
import {EventRepository} from '../event/EventRepository';
import {EventService} from '../event/EventService';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {TeamState} from '../team/TeamState';
import {ServerTimeHandler, serverTimeHandler} from '../time/serverTimeHandler';
import {UserRepository} from '../user/UserRepository';
import {UserState} from '../user/UserState';

const selfUser = new User('selfid', '');
selfUser.isMe = true;

const commonSendResponse = {
  onClientMismatch: expect.any(Function),
  protocol: ConversationProtocol.PROTEUS,
};

type MessageRepositoryDependencies = {
  assetRepository: AssetRepository;
  clientState: ClientState;
  conversationRepository: () => ConversationRepository;
  core: Account;
  cryptographyRepository: CryptographyRepository;
  eventRepository: EventRepository;
  propertiesRepository: PropertiesRepository;
  serverTimeHandler: ServerTimeHandler;
  userRepository: UserRepository;
  userState: UserState;
  conversationState: ConversationState;
};

async function buildMessageRepository(): Promise<[MessageRepository, MessageRepositoryDependencies]> {
  const userState = new UserState();
  userState.self(selfUser);
  const clientState = new ClientState();
  clientState.currentClient(new ClientEntity(true, ''));
  const core = new Account();

  const conversationState = new ConversationState(userState);
  const selfConversation = new Conversation(selfUser.id);
  selfConversation.selfUser(selfUser);
  conversationState.conversations([selfConversation]);
  const dependencies = {
    conversationRepository: () => ({} as ConversationRepository),
    cryptographyRepository: new CryptographyRepository({} as any),
    eventRepository: new EventRepository(new EventService({} as any), {} as any, {} as any, {} as any),
    propertiesRepository: new PropertiesRepository({} as any, {} as any),
    serverTimeHandler: serverTimeHandler,
    userRepository: {
      assignAllClients: jest.fn().mockResolvedValue(true),
    } as unknown as UserRepository,
    assetRepository: {} as AssetRepository,
    userState,
    teamState: new TeamState(),
    clientState,
    conversationState,
    core,
  };

  const deps = Object.values(dependencies) as ConstructorParameters<typeof MessageRepository>;
  const messageRepository = new MessageRepository(...deps);
  jest.spyOn(messageRepository as any, 'updateMessageAsSent').mockReturnValue(undefined);
  return [messageRepository, dependencies];
}

describe('MessageRepository', () => {
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

    conversation.selfUser(selfUser);

    return conversation;
  };

  const successPayload = {
    sentAt: new Date().toISOString(),
    id: createRandomUuid(),
    state: MessageSendingState.OUTGOING_SENT,
  };

  describe('sendPing', () => {
    it('sends a ping', async () => {
      const [messageRepository, {core, eventRepository}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      jest.spyOn(eventRepository, 'injectEvent').mockResolvedValue(undefined);
      const conversation = generateConversation();

      await messageRepository.sendPing(conversation);
      expect(core.service!.conversation.send).toHaveBeenCalledWith({
        ...commonSendResponse,
        conversationId: conversation.qualifiedId,
        nativePush: true,
        payload: expect.objectContaining({knock: expect.objectContaining({hotKnock: false})}),
        targetMode: undefined,
        userIds: expect.any(Object),
      });
    });
  });

  describe('sendMessageEdit', () => {
    it('sends an edit message if original message exists', async () => {
      const [messageRepository, {core, eventRepository}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      jest.spyOn(eventRepository, 'injectEvent').mockResolvedValue(undefined);

      const originalMessage = new ContentMessage(createRandomUuid());
      originalMessage.assets.push(new Text(createRandomUuid(), 'old text'));
      const conversation = generateConversation();
      conversation.addMessage(originalMessage);

      await messageRepository.sendMessageEdit(conversation, 'new text', originalMessage, []);
      expect(core.service!.conversation.send).toHaveBeenCalledWith({
        ...commonSendResponse,
        conversationId: conversation.qualifiedId,
        nativePush: true,
        payload: expect.objectContaining({
          edited: expect.objectContaining({
            replacingMessageId: originalMessage.id,
            text: expect.objectContaining({content: 'new text'}),
          }),
        }),
        targetMode: undefined,
        userIds: expect.any(Object),
      });
    });
  });

  describe('sendTextWithLinkPreview', () => {
    it('sends a text message', async () => {
      const [messageRepository, {eventRepository, core, propertiesRepository}] = await buildMessageRepository();
      spyOn(propertiesRepository, 'getPreference').and.returnValue(false);
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      spyOn(eventRepository, 'injectEvent').and.returnValue(Promise.resolve());
      const conversation = generateConversation();
      await messageRepository.sendTextWithLinkPreview(conversation, 'hello there', []);
      expect(core.service!.conversation.send).toHaveBeenCalledWith({
        ...commonSendResponse,
        conversationId: conversation.qualifiedId,
        nativePush: true,
        payload: expect.objectContaining({text: expect.objectContaining({content: 'hello there'})}),
        targetMode: undefined,
        userIds: expect.any(Object),
      });
    });
  });

  describe('deleteMessageForEveryone', () => {
    it('should not delete other users messages', async () => {
      const conversation = generateConversation(CONVERSATION_TYPE.REGULAR);
      const sender = new User('', '');
      sender.isMe = false;
      const msgToDelete = new Message(createRandomUuid());
      msgToDelete.user(sender);
      conversation.addMessage(msgToDelete);
      const [messageRepository, {core}] = await buildMessageRepository();
      spyOn(core.service!.conversation, 'send').and.returnValue(
        Promise.resolve({state: MessageSendingState.OUTGOING_SENT, sentAt: new Date().toISOString()}),
      );

      await expect(messageRepository.deleteMessageForEveryone(conversation, msgToDelete)).rejects.toMatchObject({
        type: ConversationError.TYPE.WRONG_USER,
      });
      expect(core.service!.conversation.send).not.toHaveBeenCalled();
    });

    it('should send delete and deletes message for own messages', async () => {
      const conversation = generateConversation(CONVERSATION_TYPE.REGULAR);
      conversation.participating_user_ets.push(new User('user1'));

      const messageToDelete = new Message(createRandomUuid());
      messageToDelete.user(selfUser);
      conversation.addMessage(messageToDelete);

      const [messageRepository, {core, eventRepository}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      spyOn(eventRepository.eventService, 'deleteEvent').and.returnValue(Promise.resolve());

      await messageRepository.deleteMessageForEveryone(conversation, messageToDelete);
      expect(core.service!.conversation.send).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({deleted: {messageId: messageToDelete.id}}),
          userIds: {'': {selfid: [], user1: []}},
        }),
      );
    });
  });

  describe('resetSession', () => {
    it('resets the session with another device', async () => {
      const [messageRepository, {cryptographyRepository, core}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      spyOn(cryptographyRepository, 'deleteSession');
      const conversation = generateConversation();

      const userId = {domain: 'domain1', id: 'user1'};
      const clientId = 'client1';
      await messageRepository.resetSession(userId, clientId, conversation);
      expect(cryptographyRepository.deleteSession).toHaveBeenCalledWith(userId, clientId);
      expect(core.service!.conversation.send).toHaveBeenCalled();
    });
  });

  describe('updateUserReactions', () => {
    it("should add reaction if it doesn't exist", async () => {
      const [messageRepository] = await buildMessageRepository();
      const reactions = {
        user1: 'like,love',
        user2: 'happy,sad',
      };
      const userId = 'user1';
      const reaction = 'cry';
      const expectedReactions = {
        user1: 'like,love,cry',
        user2: 'happy,sad',
      };
      const result = messageRepository.updateUserReactions(reactions, userId, reaction);
      expect(result).toEqual(expectedReactions[userId]);
    });

    it('should set the reaction for the user for the first time', async () => {
      const [messageRepository] = await buildMessageRepository();
      const reactions = {
        user1: 'like,love,haha',
        user2: 'happy,sad',
      };
      const userId = 'user3';
      const reaction = 'like';
      const expectedReactions = 'like';
      const result = messageRepository.updateUserReactions(reactions, userId, reaction);
      expect(result).toEqual(expectedReactions);
    });

    it('should delete reaction if it exists', async () => {
      const [messageRepository] = await buildMessageRepository();
      const reactions = {
        user1: 'like,love,haha',
        user2: 'happy,sad',
      };
      const userId = 'user1';
      const reaction = 'haha';
      const expectedReactions = {
        user1: 'like,love',
        user2: 'happy,sad',
      };
      const result = messageRepository.updateUserReactions(reactions, userId, reaction);
      expect(result).toEqual(expectedReactions[userId]);
    });
    it('should return an empty string if no reactions for a user', async () => {
      const [messageRepository] = await buildMessageRepository();
      const reactions = {
        user1: 'like',
        user2: 'happy,sad',
      };
      const userId = 'user1';
      const reaction = 'like';
      const expectedReactions = {
        user1: '',
        user2: 'happy,sad',
      };
      const result = messageRepository.updateUserReactions(reactions, userId, reaction);
      expect(result).toEqual(expectedReactions[userId]);
    });
  });
});
