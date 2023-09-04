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

import {ClientClassification, ClientType} from '@wireapp/api-client/lib/client';
import {Conversation, ConversationProtocol, MLSConversation} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_EVENT, ConversationMLSMessageAddEvent} from '@wireapp/api-client/lib/event';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {APIClient} from '@wireapp/api-client';
import {GenericMessage} from '@wireapp/protocol-messaging';

import {ConversationService, MessageSendingState} from '..';
import {MLSService} from '../../messagingProtocols/mls';
import {CoreCryptoMLSErrors} from '../../messagingProtocols/mls/MLSService/CoreCryptoMLSErrors';
import {ProteusService} from '../../messagingProtocols/proteus';
import * as MessagingProtocols from '../../messagingProtocols/proteus';
import * as PayloadHelper from '../../test/PayloadHelper';
import * as MessageBuilder from '../message/MessageBuilder';

const createMLSMessageAddEventMock = (conversationId: QualifiedId): ConversationMLSMessageAddEvent => ({
  data: '',
  conversation: conversationId.id,
  qualified_conversation: conversationId,
  from: '',
  senderClientId: '',
  type: CONVERSATION_EVENT.MLS_MESSAGE_ADD,
  time: '2023-08-21T06:47:43.387Z',
});

jest.mock('../../messagingProtocols/proteus', () => ({
  ...jest.requireActual('../../messagingProtocols/proteus'),
  getGenericMessageParams: jest.fn(),
  getRecipientsForConversation: jest.fn(),
  getConversationQualifiedMembers: jest.fn(),
}));
const MockedMessagingProtocols = MessagingProtocols as jest.Mocked<typeof MessagingProtocols>;

jest.mock('../message/messageSender', () => ({
  ...jest.requireActual('../message/messageSender'),
  sendMessage: jest.fn().mockImplementation(fn => fn()),
}));

const mockedProteusService = {
  encryptGenericMessage: () => Promise.resolve(),
  sendProteusMessage: () => Promise.resolve({sentAt: new Date()}),
} as unknown as ProteusService;

describe('ConversationService', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
  });

  function buildConversationService() {
    const client = new APIClient({urls: APIClient.BACKEND.STAGING});
    jest.spyOn(client.api.conversation, 'postMlsMessage').mockReturnValue(
      Promise.resolve({
        events: [],
        time: new Date().toISOString(),
      }),
    );

    jest.spyOn(client.api.user, 'postListClients').mockReturnValue(
      Promise.resolve({
        qualified_user_map: {
          'test-domain': {
            'test-id-1': [{class: ClientClassification.DESKTOP, id: 'test-client-id-1-user-1'}],
            'test-id-2': [
              {class: ClientClassification.DESKTOP, id: 'test-client-id-1-user-2'},
              {class: ClientClassification.PHONE, id: 'test-client-id-2-user-2'},
            ],
          },
        },
      }),
    );

    client.context = {
      clientType: ClientType.NONE,
      userId: PayloadHelper.getUUID(),
      clientId: PayloadHelper.getUUID(),
    };

    const mockedMLSService = {
      encryptMessage: () => {},
      commitPendingProposals: () => Promise.resolve(),
      getEpoch: () => Promise.resolve(),
      joinByExternalCommit: jest.fn(),
      registerConversation: jest.fn(),
      wipeConversation: jest.fn(),
      handleMLSMessageAddEvent: jest.fn(),
      conversationExists: jest.fn(),
      isConversationEstablished: jest.fn(),
    } as unknown as MLSService;

    const conversationService = new ConversationService(client, mockedProteusService, mockedMLSService);

    jest.spyOn(conversationService, 'joinByExternalCommit');
    jest.spyOn(conversationService, 'emit');

    return [conversationService, {apiClient: client, mlsService: mockedMLSService}] as const;
  }

  describe('"send PROTEUS"', () => {
    const messages: {type: string; message: GenericMessage}[] = [
      {type: 'text', message: MessageBuilder.buildTextMessage({text: 'test'})},
      {
        type: 'confirmation',
        message: MessageBuilder.buildConfirmationMessage({type: 1, firstMessageId: PayloadHelper.getUUID()}),
      },
      {type: 'ping', message: MessageBuilder.buildPingMessage({hotKnock: false})},
    ];
    messages.forEach(({type, message}) => {
      it(`calls callbacks when sending '${type}' message is successful`, async () => {
        const [conversationService] = buildConversationService();
        const sentTime = new Date().toISOString();

        mockedProteusService.sendMessage = jest.fn().mockResolvedValue({sentAt: sentTime});
        const promise = conversationService.send({
          protocol: ConversationProtocol.PROTEUS,
          conversationId: {id: 'conv1', domain: ''},
          payload: message,
        });

        const result = await promise;
        expect(result.sentAt).toBe(sentTime);
      });
    });
  });

  describe('"send MLS"', () => {
    const groupId = PayloadHelper.getUUID();
    const messages = [
      {type: 'text', message: MessageBuilder.buildTextMessage({text: 'test'})},
      {
        type: 'confirmation',
        message: MessageBuilder.buildConfirmationMessage({type: 1, firstMessageId: PayloadHelper.getUUID()}),
      },
      {type: 'ping', message: MessageBuilder.buildPingMessage({hotKnock: false})},
      {type: 'image', message: MessageBuilder.buildImageMessage(generateImage())},
    ];
    messages.forEach(({type, message}) => {
      it(`calls callbacks when sending '${type}' message is starting and successful`, async () => {
        const [conversationService] = buildConversationService();
        const promise = conversationService.send({
          protocol: ConversationProtocol.MLS,
          groupId,
          payload: message,
        });

        const result = await promise;
        expect(result.state).toBe(MessageSendingState.OUTGOING_SENT);
      });
    });
  });

  describe('handleConversationsEpochMismatch', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const createConversation = (epoch: number, conversationId?: string) => {
      return {
        group_id: 'group-id',
        qualified_id: {id: conversationId || 'conversation-id', domain: 'staging.zinfra.io'},
        protocol: ConversationProtocol.MLS,
        epoch,
      } as Conversation;
    };

    it('re-joins multiple not-established conversations', async () => {
      const [conversationService, {apiClient}] = buildConversationService();

      const remoteEpoch = 1;

      const mlsConversation1 = createConversation(remoteEpoch, 'conversation1');
      const mlsConversation2 = createConversation(remoteEpoch, 'conversation2');

      const mockedDBResponse: Conversation[] = [mlsConversation1, mlsConversation2];
      jest.spyOn(apiClient.api.conversation, 'getConversationList').mockResolvedValueOnce({found: mockedDBResponse});

      jest.spyOn(conversationService, 'mlsGroupExistsLocally').mockResolvedValue(false);

      await conversationService.handleConversationsEpochMismatch();
      expect(conversationService.joinByExternalCommit).toHaveBeenCalledWith(mlsConversation1.qualified_id);
      expect(conversationService.joinByExternalCommit).toHaveBeenCalledWith(mlsConversation2.qualified_id);
    });

    it('re-joins multiple conversations when mismatches detected', async () => {
      const [conversationService, {apiClient, mlsService}] = buildConversationService();

      const mlsConversation1 = createConversation(1, 'conversation1');
      const mlsConversation2 = createConversation(1, 'conversation2');

      const mockedDBResponse: Conversation[] = [mlsConversation1, mlsConversation2];
      jest.spyOn(apiClient.api.conversation, 'getConversationList').mockResolvedValueOnce({found: mockedDBResponse});

      jest.spyOn(conversationService, 'mlsGroupExistsLocally').mockResolvedValue(true);
      jest.spyOn(mlsService, 'getEpoch').mockResolvedValue(2);

      await conversationService.handleConversationsEpochMismatch();
      expect(conversationService.joinByExternalCommit).toHaveBeenCalledWith(mlsConversation1.qualified_id);
      expect(conversationService.joinByExternalCommit).toHaveBeenCalledWith(mlsConversation2.qualified_id);
    });

    it("does not re-join when there's no mismatch", async () => {
      const [conversationService, {apiClient, mlsService}] = buildConversationService();

      const mlsConversation = createConversation(1);

      const mockedDBResponse: Conversation[] = [mlsConversation];
      jest.spyOn(apiClient.api.conversation, 'getConversationList').mockResolvedValueOnce({found: mockedDBResponse});

      jest.spyOn(conversationService, 'mlsGroupExistsLocally').mockResolvedValueOnce(true);

      jest.spyOn(mlsService, 'getEpoch').mockResolvedValueOnce(1);
      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(true);

      await conversationService.handleConversationsEpochMismatch();
      expect(conversationService.joinByExternalCommit).not.toHaveBeenCalled();
    });
  });

  describe('establishMLS1to1Conversation', () => {
    it('only returns a conversation if a group is already established on backend and locally', async () => {
      const [conversationService, {apiClient, mlsService}] = buildConversationService();

      const mockConversationId = {id: 'mock-conversation-id', domain: 'staging.zinfra.io'};
      const mockGroupId = 'mock-group-id';

      const selfUser = {user: {id: 'self-user-id', domain: 'staging.zinfra.io'}, client: 'self-user-client-id'};
      const otherUserId = {id: 'other-user-id', domain: 'staging.zinfra.io'};

      const remoteEpoch = 1;

      jest.spyOn(apiClient.api.conversation, 'getMLS1to1Conversation').mockResolvedValueOnce({
        qualified_id: mockConversationId,
        protocol: ConversationProtocol.MLS,
        epoch: remoteEpoch,
        group_id: mockGroupId,
      } as unknown as MLSConversation);
      jest.spyOn(mlsService, 'isConversationEstablished').mockResolvedValueOnce(true);

      await conversationService.establishMLS1to1Conversation(mockGroupId, selfUser, otherUserId);

      expect(mlsService.registerConversation).not.toHaveBeenCalled();

      expect(conversationService.joinByExternalCommit).not.toHaveBeenCalled();
    });

    it('joins with an external commit if a group is already established on backend but not established locally', async () => {
      const [conversationService, {apiClient, mlsService}] = buildConversationService();

      const mockConversationId = {id: 'mock-conversation-id', domain: 'staging.zinfra.io'};
      const mockGroupId = 'mock-group-id';

      const selfUser = {user: {id: 'self-user-id', domain: 'staging.zinfra.io'}, client: 'self-user-client-id'};
      const otherUserId = {id: 'other-user-id', domain: 'staging.zinfra.io'};

      const remoteEpoch = 1;
      const updatedEpoch = 2;

      jest.spyOn(apiClient.api.conversation, 'getMLS1to1Conversation').mockResolvedValueOnce({
        qualified_id: mockConversationId,
        protocol: ConversationProtocol.MLS,
        epoch: remoteEpoch,
        group_id: mockGroupId,
      } as unknown as MLSConversation);

      // The 2nd request we make after joining the conversation with external commit
      jest.spyOn(apiClient.api.conversation, 'getMLS1to1Conversation').mockResolvedValueOnce({
        qualified_id: mockConversationId,
        protocol: ConversationProtocol.MLS,
        epoch: updatedEpoch,
        group_id: mockGroupId,
      } as unknown as MLSConversation);

      jest.spyOn(mlsService, 'isConversationEstablished').mockResolvedValueOnce(false);
      jest.spyOn(mlsService, 'joinByExternalCommit').mockResolvedValueOnce({events: [], time: ''});

      const establishedConversation = await conversationService.establishMLS1to1Conversation(
        mockGroupId,
        selfUser,
        otherUserId,
      );

      expect(mlsService.registerConversation).not.toHaveBeenCalled();
      expect(conversationService.joinByExternalCommit).toHaveBeenCalledWith(mockConversationId);
      expect(establishedConversation.epoch).toEqual(updatedEpoch);
    });

    it('wipes the conversation and registers it if a group is not yet established on backend', async () => {
      const [conversationService, {apiClient, mlsService}] = buildConversationService();

      const mockConversationId = {id: 'mock-conversation-id', domain: 'staging.zinfra.io'};
      const mockGroupId = 'mock-group-id';

      const selfUser = {user: {id: 'self-user-id', domain: 'staging.zinfra.io'}, client: 'self-user-client-id'};
      const otherUserId = {id: 'other-user-id', domain: 'staging.zinfra.io'};

      const remoteEpoch = 0;
      const updatedEpoch = 1;

      jest.spyOn(apiClient.api.conversation, 'getMLS1to1Conversation').mockResolvedValueOnce({
        qualified_id: mockConversationId,
        protocol: ConversationProtocol.MLS,
        epoch: remoteEpoch,
        group_id: mockGroupId,
      } as unknown as MLSConversation);

      // The 2nd request we make after successfully registering a group
      jest.spyOn(apiClient.api.conversation, 'getMLS1to1Conversation').mockResolvedValueOnce({
        qualified_id: mockConversationId,
        protocol: ConversationProtocol.MLS,
        epoch: updatedEpoch,
        group_id: mockGroupId,
      } as unknown as MLSConversation);

      jest.spyOn(mlsService, 'wipeConversation');

      const establishedConversation = await conversationService.establishMLS1to1Conversation(
        mockGroupId,
        selfUser,
        otherUserId,
      );

      expect(mlsService.wipeConversation).toHaveBeenCalledWith(mockGroupId);
      expect(mlsService.registerConversation).toHaveBeenCalledTimes(1);
      expect(mlsService.registerConversation).toHaveBeenCalledWith(mockGroupId, [otherUserId, selfUser.user], selfUser);
      expect(conversationService.joinByExternalCommit).not.toHaveBeenCalled();
      expect(establishedConversation.epoch).toEqual(updatedEpoch);
    });

    it('retries to register the conversation after it has failed for the first time', async () => {
      const [conversationService, {apiClient, mlsService}] = buildConversationService();

      const mockConversationId = {id: 'mock-conversation-id', domain: 'staging.zinfra.io'};
      const mockGroupId = 'mock-group-id';

      const selfUser = {user: {id: 'self-user-id', domain: 'staging.zinfra.io'}, client: 'self-user-client-id'};
      const otherUserId = {id: 'other-user-id', domain: 'staging.zinfra.io'};

      const remoteEpoch = 0;
      const updatedEpoch = 1;

      jest.spyOn(apiClient.api.conversation, 'getMLS1to1Conversation').mockResolvedValueOnce({
        qualified_id: mockConversationId,
        protocol: ConversationProtocol.MLS,
        epoch: remoteEpoch,
        group_id: mockGroupId,
      } as unknown as MLSConversation);

      // The 2nd request we make when retrying to register the conversation
      jest.spyOn(apiClient.api.conversation, 'getMLS1to1Conversation').mockResolvedValueOnce({
        qualified_id: mockConversationId,
        protocol: ConversationProtocol.MLS,
        epoch: remoteEpoch,
        group_id: mockGroupId,
      } as unknown as MLSConversation);

      // The 3rd request we make after successfully registering a group
      jest.spyOn(apiClient.api.conversation, 'getMLS1to1Conversation').mockResolvedValueOnce({
        qualified_id: mockConversationId,
        protocol: ConversationProtocol.MLS,
        epoch: updatedEpoch,
        group_id: mockGroupId,
      } as unknown as MLSConversation);

      jest.spyOn(mlsService, 'registerConversation').mockRejectedValueOnce(undefined);
      jest.spyOn(mlsService, 'wipeConversation');

      const establishedConversation = await conversationService.establishMLS1to1Conversation(
        mockGroupId,
        selfUser,
        otherUserId,
      );

      expect(mlsService.wipeConversation).toHaveBeenCalledWith(mockGroupId);
      expect(mlsService.registerConversation).toHaveBeenCalledTimes(2);
      expect(mlsService.registerConversation).toHaveBeenCalledWith(mockGroupId, [otherUserId, selfUser.user], selfUser);
      expect(conversationService.joinByExternalCommit).not.toHaveBeenCalled();
      expect(establishedConversation.epoch).toEqual(updatedEpoch);
    });
  });

  describe('handleEvent', () => {
    it('rejoins a MLS conversation if epoch mismatch detected when decrypting mls message', async () => {
      const [conversationService, {apiClient, mlsService}] = buildConversationService();
      const conversationId = {id: 'conversationId', domain: 'staging.zinfra.io'};
      const mockGroupId = 'mock-group-id';

      const mockMLSMessageAddEvent = createMLSMessageAddEventMock(conversationId);

      jest
        .spyOn(mlsService, 'handleMLSMessageAddEvent')
        .mockRejectedValueOnce(new Error(CoreCryptoMLSErrors.WRONG_EPOCH));

      const remoteEpoch = 5;
      const localEpoch = 4;

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(true);
      jest.spyOn(mlsService, 'getEpoch').mockResolvedValueOnce(localEpoch);

      jest.spyOn(apiClient.api.conversation, 'getConversation').mockResolvedValueOnce({
        qualified_id: conversationId,
        protocol: ConversationProtocol.MLS,
        epoch: remoteEpoch,
        group_id: mockGroupId,
      } as unknown as Conversation);

      await conversationService.handleEvent(mockMLSMessageAddEvent);

      expect(conversationService.joinByExternalCommit).toHaveBeenCalledWith(conversationId);
      expect(conversationService.emit).toHaveBeenCalledWith('MLSConversationRecovered', {conversationId});
    });
  });

  describe('fetchAllParticipantsClients', () => {
    it('gives the members and clients of a federated conversation', async () => {
      const [conversationService, {apiClient}] = buildConversationService();
      jest.spyOn(apiClient.api.conversation, 'getConversation').mockResolvedValue({
        members: {
          others: [
            {qualified_id: {domain: 'test-domain', id: 'test-id-1'}},
            {qualified_id: {domain: 'test-domain', id: 'test-id-2'}},
          ],
          self: {},
        },
      } as any);
      const members = {
        'test-domain': {
          ['test-id-1']: ['test-client-id-1-user-1'],
          ['test-id-2']: ['test-client-id-1-user-2', 'test-client-id-2-user-2'],
        },
      };

      MockedMessagingProtocols.getConversationQualifiedMembers.mockResolvedValue([
        {domain: 'test-domain', id: 'test-id-1'},
        {domain: 'test-domain', id: 'test-id-2'},
      ]);

      const fetchedMembers = await conversationService.fetchAllParticipantsClients({id: 'convid', domain: ''});
      expect(fetchedMembers).toEqual(members);
    });
  });
});

function generateImage() {
  const image = {
    data: Buffer.from([]),
    height: 123,
    type: 'image/jpeg',
    width: 456,
  };
  return {
    image,
    asset: {
      cipherText: Buffer.from([]),
      key: '',
      keyBytes: Buffer.from([]),
      sha256: Buffer.from([]),
      token: '',
    },
  };
}
