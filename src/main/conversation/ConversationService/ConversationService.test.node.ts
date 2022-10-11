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

import {APIClient} from '@wireapp/api-client';
import {ClientClassification, ClientType} from '@wireapp/api-client/src/client';
import {ConversationProtocol} from '@wireapp/api-client/src/conversation';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {MemoryEngine} from '@wireapp/store-engine';
import {ConversationService, PayloadBundleState} from '../';

import {CryptographyService} from '../../cryptography';
import * as PayloadHelper from '../../test/PayloadHelper';
import {MessageTargetMode} from './ConversationService.types';
import * as MessageBuilder from '../message/MessageBuilder';
import {NotificationService} from '../../notification/NotificationService';
import {MLSService} from '../../mls';
import * as messageSender from '../message/messageSender';

const mockedMLSService = {
  encryptMessage: () => {},
} as unknown as MLSService;

describe('ConversationService', () => {
  beforeAll(() => {
    jest.spyOn(messageSender, 'sendMessage').mockImplementation(fn => fn());
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
      {
        commitPendingProposals: () => Promise.resolve(),
      } as unknown as NotificationService,
      mockedMLSService,
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

        jest.spyOn(conversationService as any, 'sendGenericMessage').mockReturnValue(Promise.resolve({time: sentTime}));

        const promise = conversationService.send({
          protocol: ConversationProtocol.PROTEUS,
          conversationId: {id: 'conv1', domain: ''},
          payload: message,
        });

        const result = await promise;
        expect(result.sentAt).toBe(sentTime);
      });
    });

    describe('targetted messages', () => {
      const message = MessageBuilder.buildTextMessage({text: 'test'});
      it('fails if no userIds are given', done => {
        const conversationService = buildConversationService();
        conversationService
          .send({
            protocol: ConversationProtocol.PROTEUS,
            payload: message,
            targetMode: MessageTargetMode.USERS,
            conversationId: {id: 'conv1', domain: ''},
          })
          .catch(error => {
            expect(error.message).toContain('no userIds are given');
            done();
          });
      });

      [{user1: ['client1'], user2: ['client11', 'client12']}, ['user1', 'user2']].forEach(recipients => {
        it(`forwards the list of users to report (${JSON.stringify(recipients)})`, async () => {
          const conversationService = buildConversationService();
          jest
            .spyOn(conversationService as any, 'getRecipientsForConversation')
            .mockReturnValue(Promise.resolve({} as any));
          jest.spyOn(conversationService['messageService'], 'sendMessage').mockReturnValue(Promise.resolve({} as any));
          await conversationService.send({
            protocol: ConversationProtocol.PROTEUS,
            payload: message,
            targetMode: MessageTargetMode.USERS,
            userIds: recipients,
            conversationId: {id: 'conv1', domain: ''},
          });

          expect(conversationService['messageService'].sendMessage).toHaveBeenCalledWith(
            jasmine.any(String),
            jasmine.any(Object),
            jasmine.any(Uint8Array),
            jasmine.objectContaining({reportMissing: ['user1', 'user2']}),
          );
        });
      });

      [
        {domain1: {user1: ['client1'], user2: ['client11', 'client12']}, domain2: {user3: ['client1']}},
        [
          {id: 'user1', domain: 'domain1'},
          {id: 'user2', domain: 'domain1'},
          {id: 'user3', domain: 'domain2'},
        ],
      ].forEach(recipients => {
        it(`forwards the list of users to report for federated message (${JSON.stringify(recipients)})`, async () => {
          const conversationService = buildConversationService(true);
          jest
            .spyOn(conversationService as any, 'getQualifiedRecipientsForConversation')
            .mockReturnValue(Promise.resolve({} as any));
          jest
            .spyOn(conversationService['messageService'], 'sendFederatedMessage')
            .mockReturnValue(Promise.resolve({} as any));
          await conversationService.send({
            protocol: ConversationProtocol.PROTEUS,
            conversationId: {id: 'conv1', domain: 'domain1'},
            payload: message,
            targetMode: MessageTargetMode.USERS,
            userIds: recipients,
          });

          expect(conversationService['messageService'].sendFederatedMessage).toHaveBeenCalledWith(
            jasmine.any(String),
            jasmine.any(Object),
            jasmine.any(Uint8Array),
            jasmine.objectContaining({
              reportMissing: [
                {id: 'user1', domain: 'domain1'},
                {id: 'user2', domain: 'domain1'},
                {id: 'user3', domain: 'domain2'},
              ],
            }),
          );
        });
      });

      [{user1: ['client1'], user2: ['client11', 'client12']}, ['user1', 'user2']].forEach(recipients => {
        it(`ignores all missing user/client pair if targetMode is USER_CLIENTS`, async () => {
          const conversationService = buildConversationService(true);
          jest
            .spyOn(conversationService as any, 'getRecipientsForConversation')
            .mockReturnValue(Promise.resolve({} as any));
          jest.spyOn(conversationService['messageService'], 'sendMessage').mockReturnValue(Promise.resolve({} as any));
          await conversationService.send({
            conversationId: {id: 'conv1', domain: ''},
            protocol: ConversationProtocol.PROTEUS,
            payload: message,
            targetMode: MessageTargetMode.USERS_CLIENTS,
            userIds: recipients,
          });

          expect(conversationService['messageService'].sendMessage).toHaveBeenCalledWith(
            jasmine.any(String),
            jasmine.any(Object),
            jasmine.any(Uint8Array),
            jasmine.objectContaining({reportMissing: false}),
          );
        });
      });

      [
        {domain1: {user1: ['client1'], user2: ['client11', 'client12']}, domain2: {user3: ['client1']}},
        [
          {id: 'user1', domain: 'domain1'},
          {id: 'user2', domain: 'domain1'},
          {id: 'user3', domain: 'domain2'},
        ],
      ].forEach(recipients => {
        it(`ignores all missing user/client pair if targetMode is USER_CLIENTS on federated env`, async () => {
          const conversationService = buildConversationService(true);
          jest
            .spyOn(conversationService as any, 'getQualifiedRecipientsForConversation')
            .mockReturnValue(Promise.resolve({} as any));
          jest
            .spyOn(conversationService['messageService'], 'sendFederatedMessage')
            .mockReturnValue(Promise.resolve({} as any));
          await conversationService.send({
            protocol: ConversationProtocol.PROTEUS,
            conversationId: {id: 'conv1', domain: 'domain1'},
            payload: message,
            targetMode: MessageTargetMode.USERS_CLIENTS,
            userIds: recipients,
          });

          expect(conversationService['messageService'].sendFederatedMessage).toHaveBeenCalledWith(
            jasmine.any(String),
            jasmine.any(Object),
            jasmine.any(Uint8Array),
            jasmine.objectContaining({
              reportMissing: false,
            }),
          );
        });
      });
    });

    it(`indicates when sending was canceled`, async () => {
      const conversationService = buildConversationService();
      jest
        .spyOn(conversationService as any, 'sendGenericMessage')
        .mockReturnValue(Promise.resolve({time: '', errored: true}));
      const message = MessageBuilder.buildTextMessage({text: 'test'});
      const payloadBundle = await conversationService.send({
        payload: message,
        conversationId: {id: 'conv1', domain: ''},
        protocol: ConversationProtocol.PROTEUS,
      });

      expect(payloadBundle.state).toBe(PayloadBundleState.CANCELLED);
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
      jest.spyOn(conversationService as any, 'getConversationQualifiedMembers').mockReturnValue([
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
          options?.onClientMismatch?.({missing: members, deleted: {}, redundant: {}, time: ''});
          return {} as any;
        });
      const fetchedMembers = await conversationService.getAllParticipantsClients({id: 'convid', domain: ''});

      expect(fetchedMembers).toEqual(members);
    });

    it('gives the members and clients of a federated conversation', async () => {
      const members = {
        domain1: {user1: ['client1', 'client2']},
        domain2: {user2: ['client1', 'client2'], user3: ['client1', 'client2']},
      };
      const conversationService = buildConversationService(true);
      jest
        .spyOn(conversationService['messageService'], 'sendFederatedMessage')
        .mockImplementation((_client, _recipients, _text, options) => {
          options?.onClientMismatch?.({missing: members, deleted: {}, redundant: {}, failed_to_send: {}, time: ''});
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
