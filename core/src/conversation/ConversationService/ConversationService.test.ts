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
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';

import {APIClient} from '@wireapp/api-client';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {MemoryEngine} from '@wireapp/store-engine';

import {ConversationService, PayloadBundleState} from '..';
import {CryptographyService} from '../../cryptography';
import {MLSService} from '../../messagingProtocols/mls';
import * as MessagingProtocols from '../../messagingProtocols/proteus';
import * as PayloadHelper from '../../test/PayloadHelper';
import * as MessageBuilder from '../message/MessageBuilder';

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

const mockedMLSService = {
  encryptMessage: () => {},
  commitPendingProposals: () => Promise.resolve(),
} as unknown as MLSService;

const mockedProteusService = {
  encryptGenericMessage: () => Promise.resolve(),
  sendProteusMessage: () => Promise.resolve({sentAt: new Date()}),
} as unknown as MessagingProtocols.ProteusService;

describe('ConversationService', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
  });

  function buildConversationService(federated?: boolean) {
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
    return new ConversationService(
      client,
      new CryptographyService(client, new MemoryEngine(), {useQualifiedIds: false, nbPrekeys: 1}),
      {
        useQualifiedIds: federated,
      },
      mockedMLSService,
      mockedProteusService,
    );
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
        const conversationService = buildConversationService();
        const sentTime = new Date().toISOString();

        MockedMessagingProtocols.getGenericMessageParams.mockResolvedValue({
          time: sentTime,
        } as unknown as MessagingProtocols.MessageParams);
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
        const conversationService = buildConversationService();
        const promise = conversationService.send({
          protocol: ConversationProtocol.MLS,
          groupId,
          payload: message,
        });

        const result = await promise;
        expect(result.state).toBe(PayloadBundleState.OUTGOING_SENT);
      });
    });
  });

  describe('fetchAllParticipantsClients', () => {
    it('gives the members and clients of a federated conversation', async () => {
      const members = {
        'test-domain': {
          ['test-id-1']: ['test-client-id-1-user-1'],
          ['test-id-2']: ['test-client-id-1-user-2', 'test-client-id-2-user-2'],
        },
      };
      const conversationService = buildConversationService(true);
      MockedMessagingProtocols.getConversationQualifiedMembers.mockResolvedValue([
        {domain: 'test-domain', id: 'test-id-1'},
        {domain: 'test-domain', id: 'test-id-2'},
      ]);

      const fetchedMembers = await conversationService.fetchAllParticipantsClients('convid');
      expect(fetchedMembers).toEqual(members);
    });
  });

  describe('getAllParticipantsClients', () => {
    it('gives the members and clients of a federated conversation', async () => {
      const members = {
        user1: ['client1', 'client2'],
        user2: ['client1', 'client2'],
        user3: ['client1', 'client2'],
      };
      const conversationService = buildConversationService(true);
      jest
        .spyOn(conversationService['messageService'], 'sendMessage')
        .mockImplementation((_client, _recipients, _text, options) => {
          void options?.onClientMismatch?.({missing: members, deleted: {}, redundant: {}, time: ''});
          return {} as any;
        });
      const fetchedMembers = await conversationService.getAllParticipantsClients({id: 'convid', domain: ''});

      expect(fetchedMembers).toEqual(members);
    });

    it('gives the members and clients of a federated conversation 2', async () => {
      const members = {
        domain1: {user1: ['client1', 'client2']},
        domain2: {user2: ['client1', 'client2'], user3: ['client1', 'client2']},
      };
      const conversationService = buildConversationService(true);
      jest
        .spyOn(conversationService['messageService'], 'sendFederatedMessage')
        .mockImplementation((_client, _recipients, _text, options) => {
          void options?.onClientMismatch?.({
            missing: members,
            deleted: {},
            redundant: {},
            failed_to_send: {},
            time: '',
          });
          return {} as any;
        });
      const fetchedMembers = await conversationService.getAllParticipantsClients({id: 'convid', domain: 'domain1'});

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
