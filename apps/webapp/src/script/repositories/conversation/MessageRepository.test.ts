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
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {MessageSendingState} from '@wireapp/core/lib/conversation';

import {Account} from '@wireapp/core';
import {LegalHoldStatus} from '@wireapp/protocol-messaging';

import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {AudioRepository} from 'Repositories/audio/AudioRepository';
import {ClientEntity} from 'Repositories/client/ClientEntity';
import {ClientState} from 'Repositories/client/ClientState';
import {ConnectionEntity} from 'Repositories/connection/ConnectionEntity';
import {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {Button} from 'Repositories/entity/message/Button';
import {CompositeMessage} from 'Repositories/entity/message/CompositeMessage';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {Message} from 'Repositories/entity/message/Message';
import {Text} from 'Repositories/entity/message/Text';
import {User} from 'Repositories/entity/User';
import {EventRepository} from 'Repositories/event/EventRepository';
import {EventService} from 'Repositories/event/EventService';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {ReactionMap} from 'Repositories/storage';
import {TeamState} from 'Repositories/team/TeamState';
import {UserRepository} from 'Repositories/user/UserRepository';
import {UserState} from 'Repositories/user/UserState';
import {ConversationError} from 'src/script/error/ConversationError';
import {generateQualifiedId} from 'test/helper/UserGenerator';
import {createUuid} from 'Util/uuid';

import {ConversationRepository} from './ConversationRepository';
import {ConversationState} from './ConversationState';
import {MessageRepository} from './MessageRepository';

import {StatusType} from '../../message/StatusType';
import {ServerTimeHandler, serverTimeHandler} from '../../time/serverTimeHandler';

const selfUser = new User('selfid', '');
selfUser.isMe = true;

const commonSendResponse = {
  onClientMismatch: expect.any(Function),
  protocol: CONVERSATION_PROTOCOL.PROTEUS,
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
  clientState.currentClient = new ClientEntity(true, '');
  const core = new Account();

  const teamState = new TeamState();

  const conversationState = new ConversationState(userState);
  const selfConversation = new Conversation(selfUser.id);
  selfConversation.selfUser(selfUser);
  conversationState.conversations([selfConversation]);
  const dependencies = {
    conversationRepository: () => ({}) as ConversationRepository,
    cryptographyRepository: new CryptographyRepository({} as any),
    eventRepository: new EventRepository(new EventService({} as any), {} as any, {} as any, {} as any),
    propertiesRepository: new PropertiesRepository({} as any, {} as any),
    serverTimeHandler: serverTimeHandler,
    userRepository: {
      findUserById: jest.fn(),
      assignAllClients: jest.fn().mockResolvedValue(true),
    } as unknown as UserRepository,
    assetRepository: {} as AssetRepository,
    audioRepository: new AudioRepository(),
    userState,
    clientState,
    conversationState,
    teamState,
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
    const conversation = new Conversation(createUuid());
    conversation.type(conversation_type);

    const connectionEntity = new ConnectionEntity();
    connectionEntity.conversationId = conversation.qualifiedId;
    connectionEntity.status(connection_status);
    conversation.connection(connectionEntity);
    conversation.legalHoldStatus(LegalHoldStatus.DISABLED);

    conversation.selfUser(selfUser);
    conversation.participating_user_ets.push(selfUser);

    return conversation;
  };

  const successPayload = {
    sentAt: new Date().toISOString(),
    id: createUuid(),
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

      const originalMessage = new ContentMessage(createUuid());
      originalMessage.assets.push(new Text(createUuid(), 'old text'));
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

    it('sends an edit multipart message if original message has multipart asset', async () => {
      const {Multipart} = await import('Repositories/entity/message/Multipart');

      const [messageRepository, {core, eventRepository}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      jest.spyOn(eventRepository, 'injectEvent').mockResolvedValue(undefined);

      const originalMessage = new ContentMessage(createUuid());
      const attachments = [{cellAsset: {uuid: 'test-cell-id', contentType: 'application/vnd.wire-cells'}}];
      const multipartAsset = new Multipart({id: createUuid(), text: 'old text', attachments});
      originalMessage.assets.push(multipartAsset);

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
            multipart: expect.objectContaining({
              text: expect.objectContaining({content: 'new text'}),
              attachments: expect.any(Array),
            }),
          }),
        }),
        targetMode: undefined,
        userIds: expect.any(Object),
      });
    });

    it('preserves attachments when editing multipart message', async () => {
      const {Multipart} = await import('Repositories/entity/message/Multipart');

      const [messageRepository, {core, eventRepository}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      jest.spyOn(eventRepository, 'injectEvent').mockResolvedValue(undefined);

      const cellId1 = 'cell-uuid-1';
      const cellId2 = 'cell-uuid-2';
      const attachments = [
        {cellAsset: {uuid: cellId1, contentType: 'application/vnd.wire-cells'}},
        {cellAsset: {uuid: cellId2, contentType: 'application/vnd.wire-cells'}},
      ];

      const originalMessage = new ContentMessage(createUuid());
      const multipartAsset = new Multipart({id: createUuid(), text: 'original text', attachments});
      originalMessage.assets.push(multipartAsset);

      const conversation = generateConversation();
      conversation.addMessage(originalMessage);

      await messageRepository.sendMessageEdit(conversation, 'edited text', originalMessage, []);

      const sendCall = (core.service!.conversation.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.payload.edited.multipart.text).toEqual(expect.objectContaining({content: 'edited text'}));
      expect(sendCall.payload.edited.multipart.attachments).toHaveLength(2);
      expect(sendCall.payload.edited.multipart.attachments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            cellAsset: expect.objectContaining({uuid: cellId1, contentType: 'application/vnd.wire-cells'}),
          }),
          expect.objectContaining({
            cellAsset: expect.objectContaining({uuid: cellId2, contentType: 'application/vnd.wire-cells'}),
          }),
        ]),
      );
    });

    it('handles empty attachments array when editing multipart message', async () => {
      const {Multipart} = await import('Repositories/entity/message/Multipart');

      const [messageRepository, {core, eventRepository}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      jest.spyOn(eventRepository, 'injectEvent').mockResolvedValue(undefined);

      const originalMessage = new ContentMessage(createUuid());
      const multipartAsset = new Multipart({id: createUuid(), text: 'original text', attachments: []});
      originalMessage.assets.push(multipartAsset);

      const conversation = generateConversation();
      conversation.addMessage(originalMessage);

      await messageRepository.sendMessageEdit(conversation, 'edited text', originalMessage, []);

      expect(core.service!.conversation.send).toHaveBeenCalledWith({
        ...commonSendResponse,
        conversationId: conversation.qualifiedId,
        nativePush: true,
        payload: expect.objectContaining({
          edited: expect.objectContaining({
            replacingMessageId: originalMessage.id,
            multipart: expect.objectContaining({
              text: expect.objectContaining({content: 'edited text'}),
            }),
          }),
        }),
        targetMode: undefined,
        userIds: expect.any(Object),
      });
    });

    it('filters out falsy attachments when editing multipart message', async () => {
      const {Multipart} = await import('Repositories/entity/message/Multipart');

      const [messageRepository, {core, eventRepository}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      jest.spyOn(eventRepository, 'injectEvent').mockResolvedValue(undefined);

      const cellId = 'valid-cell-id';
      const attachments = [
        {cellAsset: {uuid: cellId, contentType: 'application/vnd.wire-cells'}},
        null,
        undefined,
        {cellAsset: {uuid: 'another-cell-id', contentType: 'application/vnd.wire-cells'}},
      ] as any;

      const originalMessage = new ContentMessage(createUuid());
      const multipartAsset = new Multipart({id: createUuid(), text: 'original text', attachments});
      originalMessage.assets.push(multipartAsset);

      const conversation = generateConversation();
      conversation.addMessage(originalMessage);

      await messageRepository.sendMessageEdit(conversation, 'edited text', originalMessage, []);

      const sendCall = (core.service!.conversation.send as jest.Mock).mock.calls[0][0];
      const resultAttachments = sendCall.payload.edited.multipart.attachments;

      // Should have 2 valid attachments (null and undefined filtered out)
      expect(resultAttachments).toHaveLength(2);
      expect(resultAttachments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            cellAsset: expect.objectContaining({uuid: cellId, contentType: 'application/vnd.wire-cells'}),
          }),
          expect.objectContaining({
            cellAsset: expect.objectContaining({uuid: 'another-cell-id', contentType: 'application/vnd.wire-cells'}),
          }),
        ]),
      );
      expect(sendCall.payload.edited.multipart.text).toEqual(expect.objectContaining({content: 'edited text'}));
    });
  });

  describe('given a button action confirmation message', () => {
    it('when the message is sent, then should send without targeted parameters and update local state of button', async () => {
      // given
      const [messageRepository, {core, eventRepository}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      jest.spyOn(eventRepository, 'injectEvent').mockResolvedValue(undefined);

      // Spy on the internal method that sendButtonAction actually calls
      const sendAndInjectMessageSpy = jest
        .spyOn(messageRepository as any, 'sendAndInjectMessage')
        .mockResolvedValue(undefined);

      // Create a mock message entity with primary_key for updateEventSequentially
      const mockMessageEntity = new CompositeMessage(createUuid());
      mockMessageEntity.primary_key = 'test-primary-key';

      const getMessageInConversationIdSpy = jest
        .spyOn(messageRepository as any, 'getMessageInConversationById')
        .mockResolvedValue(mockMessageEntity);

      // Mock the eventService.updateEventSequentially method
      const updateEventSequentiallySpy = jest
        .spyOn(eventRepository.eventService, 'updateEventSequentially')
        .mockResolvedValue(1);

      const buttonId = createUuid();
      const theNewButton = [new Button(buttonId, 'Button 1')];
      const originalMessage = new CompositeMessage(createUuid());

      // Set the sender properly, as sendButtonAction expects the message to have a senderId check
      originalMessage.user(selfUser);
      originalMessage.from = selfUser.id;

      originalMessage.errorButtonId(undefined);
      originalMessage.assets.push(...theNewButton);

      // Mock getSelectionChange to return changes (simulating that button selection creates changes)
      const mockChanges = {selected_button_id: buttonId, version: 1};
      jest.spyOn(originalMessage, 'getSelectionChange').mockReturnValue(mockChanges);

      const conversation = generateConversation();
      conversation.addMessage(originalMessage);

      // when
      await messageRepository.sendButtonAction(conversation, originalMessage, buttonId);

      // then - send message is called without targetMode or recipients
      expect(sendAndInjectMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          buttonAction: expect.objectContaining({
            buttonId: buttonId,
            referenceMessageId: originalMessage.id,
          }),
          messageId: expect.any(String),
        }),
        conversation,
        expect.objectContaining({
          nativePush: false,
          skipInjection: true,
        }),
      );
      expect(getMessageInConversationIdSpy).toHaveBeenCalledWith(conversation, originalMessage.id);

      // Verify that updateEventSequentially is called with the expected parameters
      expect(updateEventSequentiallySpy).toHaveBeenCalledWith({
        primary_key: mockMessageEntity.primary_key,
        ...mockChanges,
      });
    });

    it('when no changes are returned, then no update should be called', async () => {
      // given
      const [messageRepository, {core, eventRepository}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      jest.spyOn(eventRepository, 'injectEvent').mockResolvedValue(undefined);

      // Spy on the internal method that sendButtonAction actually calls
      const sendAndInjectMessageSpy = jest
        .spyOn(messageRepository as any, 'sendAndInjectMessage')
        .mockResolvedValue(undefined);

      // Create a mock message entity with primary_key for updateEventSequentially
      const mockMessageEntity = new CompositeMessage(createUuid());
      mockMessageEntity.primary_key = 'test-primary-key';

      jest.spyOn(messageRepository as any, 'getMessageInConversationById').mockResolvedValue(mockMessageEntity);

      // Mock the eventService.updateEventSequentially method
      const updateEventSequentiallySpy = jest
        .spyOn(eventRepository.eventService, 'updateEventSequentially')
        .mockResolvedValue(1);

      const buttonId = createUuid();
      const theNewButton = [new Button(buttonId, 'Button 1')];
      const originalMessage = new CompositeMessage(createUuid());

      // Set the sender properly, as sendButtonAction expects the message to have a senderId check
      originalMessage.user(selfUser);
      originalMessage.from = selfUser.id;

      originalMessage.errorButtonId(undefined);
      originalMessage.assets.push(...theNewButton);

      // Mock getSelectionChange to return false (no changes)
      jest.spyOn(originalMessage, 'getSelectionChange').mockReturnValue(false);

      const conversation = generateConversation();
      conversation.addMessage(originalMessage);

      // when
      await messageRepository.sendButtonAction(conversation, originalMessage, buttonId);

      // then - verify updateEventSequentially is NOT called when there are no changes
      expect(sendAndInjectMessageSpy).not.toHaveBeenCalled();
      expect(updateEventSequentiallySpy).not.toHaveBeenCalled();
    });
  });

  describe('sendTextWithLinkPreview', () => {
    it('sends a text message', async () => {
      const [messageRepository, {eventRepository, core, propertiesRepository}] = await buildMessageRepository();
      spyOn(propertiesRepository, 'getPreference').and.returnValue(false);
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      spyOn(eventRepository, 'injectEvent').and.returnValue(Promise.resolve());
      const conversation = generateConversation();
      await messageRepository.sendTextWithLinkPreview({conversation, textMessage: 'hello there', mentions: []});
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
      const msgToDelete = new Message(createUuid());
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

      const messageToDelete = new Message(createUuid());
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

    it('should send delete and deletes message for own pending/gray messages', async () => {
      const conversation = generateConversation(CONVERSATION_TYPE.REGULAR);
      conversation.participating_user_ets.push(new User('user1'));

      const messageToDelete = new Message(createUuid());
      messageToDelete.user(selfUser);
      messageToDelete.status(StatusType.SENDING);
      conversation.addMessage(messageToDelete);

      const [messageRepository, {core, eventRepository}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      spyOn(eventRepository.eventService, 'deleteEvent').and.returnValue(Promise.resolve());
      spyOn(messageRepository, 'deleteMessageById');

      await messageRepository.deleteMessageForEveryone(conversation, messageToDelete);

      expect(messageRepository.deleteMessageById).toHaveBeenCalledWith(conversation, messageToDelete.id);
    });
  });

  describe('resetSession', () => {
    it('resets the session with another device', async () => {
      const [messageRepository, {cryptographyRepository, core}] = await buildMessageRepository();
      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      jest.spyOn(cryptographyRepository, 'getRemoteFingerprint').mockResolvedValue('first');
      spyOn(cryptographyRepository, 'deleteSession');
      const conversation = generateConversation();

      const userId = {domain: 'domain1', id: 'user1'};
      const clientId = 'client1';
      await messageRepository.resetSession(userId, clientId, conversation);
      expect(cryptographyRepository.deleteSession).toHaveBeenCalledWith(userId, clientId);
      expect(core.service!.conversation.send).toHaveBeenCalled();
    });

    it('unverifies device if fingerprint has changed', async () => {
      const [messageRepository, {cryptographyRepository, userRepository, core}] = await buildMessageRepository();
      const user = new User();
      const clientId = 'client1';

      const device = new ClientEntity(false, 'domain', clientId);
      device.meta.isVerified(true);
      user.devices([device]);

      jest.spyOn(userRepository, 'findUserById').mockReturnValue(user);

      jest.spyOn(core.service!.conversation, 'send').mockResolvedValue(successPayload);
      jest
        .spyOn(cryptographyRepository, 'getRemoteFingerprint')
        .mockResolvedValueOnce('first')
        .mockResolvedValue('second');

      spyOn(cryptographyRepository, 'deleteSession');
      const conversation = generateConversation();

      const userId = {domain: 'domain1', id: 'user1'};
      expect(device.meta.isVerified()).toBe(true);
      await messageRepository.resetSession(userId, clientId, conversation);
      expect(device.meta.isVerified()).toBe(false);
      expect(cryptographyRepository.deleteSession).toHaveBeenCalledWith(userId, clientId);
      expect(core.service!.conversation.send).toHaveBeenCalled();
    });
  });

  describe('updateUserReactions', () => {
    it("should add reaction if it doesn't exist", async () => {
      const [messageRepository] = await buildMessageRepository();
      const userId = generateQualifiedId();
      const reactions: ReactionMap = [
        ['like', [userId]],
        ['love', [userId]],
        ['sad', [{id: 'user2', domain: ''}]],
        ['happy', [{id: 'user2', domain: ''}]],
      ];
      const reaction = 'cry';
      const expectedReactions = 'like,love,cry';
      const result = messageRepository.updateUserReactions(reactions, userId, reaction);
      expect(result).toEqual(expectedReactions);
    });

    it('should set the reaction for the user for the first time', async () => {
      const [messageRepository] = await buildMessageRepository();
      const userId = generateQualifiedId();
      const reactions: ReactionMap = [
        ['sad', [{id: 'user2', domain: ''}]],
        ['happy', [{id: 'user2', domain: ''}]],
      ];
      const reaction = 'like';
      const expectedReactions = 'like';
      const result = messageRepository.updateUserReactions(reactions, userId, reaction);
      expect(result).toEqual(expectedReactions);
    });

    it('should delete reaction if it exists', async () => {
      const [messageRepository] = await buildMessageRepository();
      const userId = generateQualifiedId();
      const reactions: ReactionMap = [
        ['like', [userId]],
        ['love', [userId]],
        ['haha', [userId]],
        ['sad', [{id: 'user2', domain: ''}]],
        ['happy', [{id: 'user2', domain: ''}]],
      ];
      const reaction = 'haha';
      const expectedReactions = 'like,love';
      const result = messageRepository.updateUserReactions(reactions, userId, reaction);
      expect(result).toEqual(expectedReactions);
    });

    it('should return an empty string if no reactions for a user', async () => {
      const [messageRepository] = await buildMessageRepository();
      const userId = generateQualifiedId();
      const reactions: ReactionMap = [['like', [userId]]];
      const reaction = 'like';
      const expectedReactions = '';
      const result = messageRepository.updateUserReactions(reactions, userId, reaction);
      expect(result).toEqual(expectedReactions);
    });
  });
});
