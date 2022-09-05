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
import {LegalHoldStatus} from '@wireapp/protocol-messaging';
import {createRandomUuid} from 'Util/util';
import {Conversation} from 'src/script/entity/Conversation';
import {ConnectionEntity} from 'src/script/connection/ConnectionEntity';
import {User} from 'src/script/entity/User';
import {Text} from 'src/script/entity/message/Text';
import {Message} from 'src/script/entity/message/Message';
import {ConversationError} from 'src/script/error/ConversationError';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {ConversationRepository} from './ConversationRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {EventRepository} from '../event/EventRepository';
import {MessageSender} from '../message/MessageSender';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {ServerTimeHandler, serverTimeHandler} from '../time/serverTimeHandler';
import {UserRepository} from '../user/UserRepository';
import {AssetRepository} from '../assets/AssetRepository';
import {UserState} from '../user/UserState';
import {ClientState} from '../client/ClientState';
import {EventService} from '../event/EventService';
import {Core} from '../service/CoreSingleton';
import {container} from 'tsyringe';
import {ClientEntity} from '../client/ClientEntity';
import {TeamState} from '../team/TeamState';
import {ContentMessage} from '../entity/message/ContentMessage';
import {PayloadBundleState} from '@wireapp/core/src/main/conversation';

const selfUser = new User('selfid', '');
selfUser.isMe = true;

type MessageRepositoryDependencies = {
  assetRepository: AssetRepository;
  clientState: ClientState;
  conversationRepository: () => ConversationRepository;
  core: Core;
  cryptographyRepository: CryptographyRepository;
  eventRepository: EventRepository;
  messageSender: MessageSender;
  propertiesRepository: PropertiesRepository;
  serverTimeHandler: ServerTimeHandler;
  userRepository: UserRepository;
  userState: UserState;
};

async function buildMessageRepository(): Promise<[MessageRepository, MessageRepositoryDependencies]> {
  const userState = new UserState();
  userState.self(selfUser);
  const clientState = new ClientState();
  clientState.currentClient(new ClientEntity(true, ''));
  const core = container.resolve(Core);
  const messageSender = new MessageSender();
  messageSender.pauseQueue(false);
  await core.initServices({} as any);
  /* eslint-disable sort-keys-fix/sort-keys-fix */
  const dependencies = {
    conversationRepository: () => ({} as ConversationRepository),
    cryptographyRepository: new CryptographyRepository({} as any),
    eventRepository: new EventRepository(new EventService({} as any), {} as any, {} as any, {} as any),
    messageSender,
    propertiesRepository: new PropertiesRepository({} as any, {} as any),
    serverTimeHandler: serverTimeHandler,
    userRepository: {} as UserRepository,
    assetRepository: {} as AssetRepository,
    userState,
    teamState: new TeamState(),
    clientState,
    core,
  };
  /* eslint-disable sort-keys-fix/sort-keys-fix */
  const deps = Object.values(dependencies) as ConstructorParameters<typeof MessageRepository>;
  return [new MessageRepository(...deps), dependencies];
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

  describe('sendPing', () => {
    it('sends a ping', async () => {
      const [messageRepository, {core}] = await buildMessageRepository();
      spyOn(core.service!.conversation, 'send').and.returnValue(Promise.resolve());
      const conversation = generateConversation();

      await messageRepository.sendPing(conversation);
      expect(core.service!.conversation.send).toHaveBeenCalledWith({
        callbacks: expect.any(Object),
        conversationDomain: undefined,
        nativePush: true,
        payloadBundle: expect.objectContaining({
          content: expect.objectContaining({hotKnock: false}),
          conversation: conversation.id,
        }),
        targetMode: undefined,
        userIds: expect.any(Object),
      });
    });
  });

  describe('sendMessageEdit', () => {
    it('sends an edit message if original message exists', async () => {
      const [messageRepository, {core}] = await buildMessageRepository();
      spyOn(core.service!.conversation, 'send').and.returnValue(
        Promise.resolve({state: PayloadBundleState.OUTGOING_SENT}),
      );

      const originalMessage = new ContentMessage(createRandomUuid());
      originalMessage.assets.push(new Text(createRandomUuid(), 'old text'));
      const conversation = generateConversation();
      conversation.addMessage(originalMessage);

      await messageRepository.sendMessageEdit(conversation, 'new text', originalMessage, []);
      expect(core.service!.conversation.send).toHaveBeenCalledWith({
        callbacks: expect.any(Object),
        conversationDomain: undefined,
        nativePush: true,
        payloadBundle: expect.objectContaining({
          content: expect.objectContaining({text: 'new text', originalMessageId: originalMessage.id}),
          conversation: conversation.id,
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
      spyOn(core.service!.conversation, 'send').and.returnValue(
        Promise.resolve({state: PayloadBundleState.OUTGOING_SENT}),
      );
      spyOn(eventRepository, 'injectEvent').and.returnValue(Promise.resolve());
      const conversation = generateConversation();
      await messageRepository.sendTextWithLinkPreview(conversation, 'hello there', []);
      expect(core.service!.conversation.send).toHaveBeenCalledWith({
        callbacks: expect.any(Object),
        conversationDomain: undefined,
        nativePush: true,
        payloadBundle: expect.objectContaining({
          content: expect.objectContaining({text: 'hello there'}),
          conversation: conversation.id,
        }),
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
      spyOn(core.service!.conversation, 'deleteMessageEveryone');

      await expect(messageRepository.deleteMessageForEveryone(conversation, msgToDelete)).rejects.toMatchObject({
        type: ConversationError.TYPE.WRONG_USER,
      });
      expect(core.service!.conversation.deleteMessageEveryone).not.toHaveBeenCalled();
    });

    it('should send delete and deletes message for own messages', async () => {
      const conversation = generateConversation(CONVERSATION_TYPE.REGULAR);
      conversation.participating_user_ets.push(new User('user1'));

      const messageToDelete = new Message(createRandomUuid());
      messageToDelete.user(selfUser);
      conversation.addMessage(messageToDelete);

      const [messageRepository, {core, eventRepository}] = await buildMessageRepository();
      spyOn(core.service!.conversation, 'deleteMessageEveryone');
      spyOn(eventRepository.eventService, 'deleteEvent').and.returnValue(Promise.resolve());

      await messageRepository.deleteMessageForEveryone(conversation, messageToDelete);
      expect(core.service!.conversation.deleteMessageEveryone).toHaveBeenCalledWith(
        conversation.id,
        messageToDelete.id,
        ['selfid', 'user1'],
        true,
        undefined,
      );
      expect(eventRepository.eventService.deleteEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetSession', () => {
    it('resets the session with another device', async () => {
      const [messageRepository, {cryptographyRepository, core}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue({} as any);
      spyOn(cryptographyRepository, 'deleteSession');
      const conversation = generateConversation();

      const userId = {domain: 'domain1', id: 'user1'};
      const clientId = 'client1';
      await messageRepository.resetSession(userId, clientId, conversation);
      expect(cryptographyRepository.deleteSession).toHaveBeenCalledWith(userId, clientId);
      expect(core.service!.conversation.send).toHaveBeenCalled();
    });
  });
});
