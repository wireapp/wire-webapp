/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {
  MessageSendingStatus,
  OTRRecipients,
  QualifiedOTRRecipients,
  QualifiedUserClients,
} from '@wireapp/api-client/lib/conversation';
import {StatusCodes} from 'http-status-codes';
import {v4 as uuidv4} from 'uuid';

import {APIClient} from '@wireapp/api-client';
import {GenericMessage, Text} from '@wireapp/protocol-messaging';

import {MessageService} from './MessageService';

import {
  buildProteusService,
  cleanupProteusServiceMocks,
} from '../../messagingProtocols/proteus/ProteusService/ProteusService.mocks';
import {getUUID} from '../../test/PayloadHelper';

const baseMessageSendingStatus: MessageSendingStatus = {
  deleted: {},
  missing: {},
  failed_to_confirm_clients: {},
  redundant: {},
  time: new Date().toISOString(),
};

type TestUser = {id: string; domain: string; clients: string[]};
const user1: TestUser = {
  id: uuidv4(),
  domain: '1.wire.test',
  clients: ['client1.1', 'client1.2', 'client1.3', 'client1.4'],
};
const user2: TestUser = {
  id: uuidv4(),
  domain: '2.wire.test',
  clients: ['client2.1', 'client2.2', 'client2.3', 'client2.4'],
};

function generateQualifiedRecipients(users: TestUser[]): QualifiedUserClients {
  const payload: QualifiedUserClients = {};
  users.forEach(({id, domain, clients}) => {
    payload[domain] ||= {};
    payload[domain][id] = clients;
  });
  return payload;
}

function generateRecipients(users: TestUser[]): QualifiedUserClients {
  return users.reduce<QualifiedUserClients>((acc, {id, domain, clients}) => {
    const domainUsers = acc[domain] || {};
    domainUsers[id] = clients;
    acc[domain] = domainUsers;
    return acc;
  }, {});
}

function fakeEncrypt(_: unknown, recipients: QualifiedUserClients): Promise<{payloads: QualifiedOTRRecipients}> {
  const encryptedPayload = Object.entries(recipients).reduce((acc, [domain, users]) => {
    acc[domain] = Object.entries(users).reduce((userClients, [userId, clients]) => {
      userClients[userId] = clients.reduce((payloads, client) => {
        payloads[client] = new Uint8Array();
        return payloads;
      }, {} as any);
      return userClients;
    }, {} as OTRRecipients<Uint8Array>);
    return acc;
  }, {} as QualifiedOTRRecipients);
  return Promise.resolve({payloads: encryptedPayload});
}

const apiClients: APIClient[] = [];

const buildMessageService = async () => {
  const apiClient = new APIClient();
  apiClients.push(apiClient);
  const [proteusService] = await buildProteusService();
  const messageService = new MessageService(apiClient, proteusService);
  jest.spyOn(proteusService, 'encrypt').mockImplementation(fakeEncrypt as any);

  return [messageService, {apiClient, proteusService}] as const;
};

describe('MessageService', () => {
  afterAll(() => {
    apiClients.forEach(client => client.disconnect());
    cleanupProteusServiceMocks();
  });
  describe('sendMessage', () => {
    const generateUsers = (userCount: number, clientsPerUser: number): TestUser[] => {
      return Array.from(Array(userCount)).map<TestUser>((_, i) => ({
        id: `user${i}`,
        domain: `${i}.domain`,
        clients: Array.from(Array(clientsPerUser)).map((_, j) => `client${i}${j}`),
      }));
    };

    const clientId = 'sendingClient';
    const conversationId = {id: 'conv1', domain: ''};
    const createMessage = (content: string) => {
      const customTextMessage = GenericMessage.create({
        messageId: getUUID(),
        text: Text.create({content}),
      });

      return GenericMessage.encode(customTextMessage).finish();
    };

    it('sends a message and forwards backend response', async () => {
      const [messageService, {apiClient}] = await buildMessageService();

      jest.spyOn(apiClient.api.conversation, 'postOTRMessage').mockResolvedValue(baseMessageSendingStatus);
      const recipients = generateQualifiedRecipients([user1, user2]);

      const result = await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
        conversationId: {id: 'convid', domain: 'domain'},
      });
      expect(apiClient.api.conversation.postOTRMessage).toHaveBeenCalled();
      expect(result).toEqual({...baseMessageSendingStatus, failed: undefined});
    });

    it('should send regular to conversation', async () => {
      const [messageService, {apiClient}] = await buildMessageService();

      const message = 'Lorem ipsum dolor sit amet';
      jest
        .spyOn(apiClient.api.conversation, 'postOTRMessage')
        .mockReturnValue(Promise.resolve({} as MessageSendingStatus));

      await messageService.sendMessage(clientId, generateRecipients(generateUsers(3, 3)), createMessage(message), {
        conversationId,
      });
      expect(apiClient.api.conversation.postOTRMessage).toHaveBeenCalledWith(
        conversationId.id,
        conversationId.domain,
        expect.any(Object),
      );
    });

    it('should broadcast regular message if no conversationId is given', async () => {
      const [messageService, {apiClient}] = await buildMessageService();

      const message = 'Lorem ipsum dolor sit amet';
      jest
        .spyOn(apiClient.api.broadcast, 'postBroadcastMessage')
        .mockReturnValue(Promise.resolve({} as MessageSendingStatus));

      await messageService.sendMessage(clientId, generateRecipients(generateUsers(3, 3)), createMessage(message));
      expect(apiClient.api.broadcast.postBroadcastMessage).toHaveBeenCalledWith(clientId, expect.any(Object));
    });

    describe('federated client mismatch', () => {
      const baseClientMismatch: MessageSendingStatus = {
        deleted: {},
        missing: {},
        redundant: {},
        failed_to_confirm_clients: {},
        time: new Date().toISOString(),
      };

      it('handles client mismatch when no other clients from that domain are known', async () => {
        const [messageService, {apiClient}] = await buildMessageService();

        let spyCounter = 0;
        const clientMismatch = {
          ...baseClientMismatch,
          missing: {[user1.domain]: {[user1.id]: ['client']}},
        };
        jest.spyOn(apiClient.api.conversation, 'postOTRMessage').mockImplementation(() => {
          spyCounter++;
          if (spyCounter === 1) {
            const error = new Error();
            (error as any).response = {
              status: StatusCodes.PRECONDITION_FAILED,
              data: clientMismatch,
            };
            return Promise.reject(error);
          }
          return Promise.resolve(baseClientMismatch);
        });
        jest
          .spyOn(apiClient.api.user, 'postMultiPreKeyBundles')
          .mockReturnValue(Promise.resolve({qualified_user_client_prekeys: {}}));

        const recipients = generateRecipients([]);

        await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          conversationId: {id: 'convid', domain: ''},
        });
        expect(apiClient.api.conversation.postOTRMessage).toHaveBeenCalledTimes(2);
      });

      it('handles client mismatch internally if no onClientMismatch is given', async () => {
        const [messageService, {apiClient}] = await buildMessageService();

        let spyCounter = 0;
        const clientMismatch = {
          ...baseClientMismatch,
          deleted: {[user1.domain]: {[user1.id]: [user1.clients[0]]}},
          missing: {[user2.domain]: {[user2.id]: ['client22']}},
        };
        jest.spyOn(apiClient.api.conversation, 'postOTRMessage').mockImplementation(() => {
          spyCounter++;
          if (spyCounter === 1) {
            const error = new Error();
            (error as any).response = {
              status: StatusCodes.PRECONDITION_FAILED,
              data: clientMismatch,
            };
            return Promise.reject(error);
          }
          return Promise.resolve(baseClientMismatch);
        });
        jest
          .spyOn(apiClient.api.user, 'postMultiPreKeyBundles')
          .mockReturnValue(Promise.resolve({qualified_user_client_prekeys: {}}));

        const recipients = generateRecipients([user1, user2]);

        await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          conversationId: {id: 'convid', domain: ''},
        });
        expect(apiClient.api.conversation.postOTRMessage).toHaveBeenCalledTimes(2);
      });

      it('continues message sending if onClientMismatch returns true', async () => {
        const [messageService, {apiClient}] = await buildMessageService();

        const onClientMismatch = jest.fn().mockReturnValue(Promise.resolve(true));
        const clientMismatch = {...baseClientMismatch, missing: {[user2.domain]: {[user2.id]: ['client22']}}};
        let spyCounter = 0;
        jest.spyOn(apiClient.api.conversation, 'postOTRMessage').mockImplementation(() => {
          spyCounter++;
          if (spyCounter === 1) {
            const error = new Error();
            (error as any).response = {
              status: StatusCodes.PRECONDITION_FAILED,
              data: clientMismatch,
            };
            return Promise.reject(error);
          }
          return Promise.resolve(baseClientMismatch);
        });
        jest
          .spyOn(apiClient.api.user, 'postMultiPreKeyBundles')
          .mockReturnValue(Promise.resolve({qualified_user_client_prekeys: {}}));

        const recipients = generateRecipients([user1, user2]);

        await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          onClientMismatch,
          conversationId: {id: 'convid', domain: ''},
        });
        expect(apiClient.api.conversation.postOTRMessage).toHaveBeenCalledTimes(2);
        expect(onClientMismatch).toHaveBeenCalledWith(clientMismatch);
      });

      it('stops message sending if onClientMismatch returns false', async () => {
        const [messageService, {apiClient}] = await buildMessageService();

        const onClientMismatch = jest.fn().mockReturnValue(Promise.resolve(false));
        const clientMismatch = {...baseMessageSendingStatus, missing: {[user2.id]: ['client22']}};
        jest.spyOn(apiClient.api.conversation, 'postOTRMessage').mockImplementation(() => {
          const error = new Error();
          (error as any).response = {
            status: StatusCodes.PRECONDITION_FAILED,
            data: clientMismatch,
          };
          return Promise.reject(error);
        });
        jest
          .spyOn(apiClient.api.user, 'postMultiPreKeyBundles')
          .mockReturnValue(Promise.resolve({qualified_user_client_prekeys: {}}));

        const recipients = generateRecipients([user1, user2]);

        await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          onClientMismatch,
          conversationId: {id: 'convid', domain: ''},
        });
        expect(apiClient.api.conversation.postOTRMessage).toHaveBeenCalledTimes(1);
        expect(onClientMismatch).toHaveBeenCalledWith(clientMismatch);
      });
    });

    describe('client mismatch', () => {
      it('handles client mismatch internally if no onClientMismatch is given', async () => {
        const [messageService, {apiClient}] = await buildMessageService();

        let spyCounter = 0;
        const clientMismatch = {
          ...baseMessageSendingStatus,
          deleted: {[user1.domain]: {[user1.id]: [user1.clients[0]]}},
          missing: {'2.wire.test': {[user2.id]: ['client22']}},
        };
        jest.spyOn(apiClient.api.conversation, 'postOTRMessage').mockImplementation(() => {
          spyCounter++;
          if (spyCounter === 1) {
            const error = new Error();
            (error as any).response = {
              status: StatusCodes.PRECONDITION_FAILED,
              data: clientMismatch,
            };
            return Promise.reject(error);
          }
          return Promise.resolve(baseMessageSendingStatus);
        });
        jest
          .spyOn(apiClient.api.user, 'postMultiPreKeyBundles')
          .mockReturnValue(Promise.resolve({qualified_user_client_prekeys: {}}));

        const recipients = generateQualifiedRecipients([user1, user2]);

        await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          conversationId: {id: 'convid', domain: ''},
        });
        expect(apiClient.api.conversation.postOTRMessage).toHaveBeenCalledTimes(2);
      });

      it('continues message sending if onClientMismatch returns true', async () => {
        const [messageService, {apiClient}] = await buildMessageService();

        const onClientMismatch = jest.fn().mockReturnValue(true);
        const clientMismatch = {...baseMessageSendingStatus, missing: {'2.wire.test': {[user2.id]: ['client22']}}};
        let spyCounter = 0;
        jest.spyOn(apiClient.api.conversation, 'postOTRMessage').mockImplementation(() => {
          spyCounter++;
          if (spyCounter === 1) {
            const error = new Error();
            (error as any).response = {
              status: StatusCodes.PRECONDITION_FAILED,
              data: clientMismatch,
            };
            return Promise.reject(error);
          }
          return Promise.resolve(baseMessageSendingStatus);
        });
        jest
          .spyOn(apiClient.api.user, 'postMultiPreKeyBundles')
          .mockReturnValue(Promise.resolve({qualified_user_client_prekeys: {}}));

        const recipients = generateQualifiedRecipients([user1, user2]);

        await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          onClientMismatch,
          conversationId: {id: 'convid', domain: ''},
        });
        expect(apiClient.api.conversation.postOTRMessage).toHaveBeenCalledTimes(2);
        expect(onClientMismatch).toHaveBeenCalledWith(clientMismatch);
      });

      it('warns the consumer if they try to send a message to a deleted client', async () => {
        const [messageService, {apiClient, proteusService}] = await buildMessageService();

        const onClientMismatch = jest.fn().mockReturnValue(true);
        const recipients = generateQualifiedRecipients([user1, user2]);
        const unknowns = {
          [user1.domain]: {
            [user1.id]: [user1.clients[0]],
          },
        };
        jest.spyOn(proteusService, 'encrypt').mockResolvedValue({
          payloads: {},
          unknowns,
        });
        jest.spyOn(apiClient.api.conversation, 'postOTRMessage').mockResolvedValue(baseMessageSendingStatus);

        const result = await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          onClientMismatch,
          conversationId: {id: 'convid', domain: ''},
        });

        expect(result.deleted).toEqual(unknowns);
      });

      it('stops message sending if onClientMismatch returns false', async () => {
        const [messageService, {apiClient}] = await buildMessageService();

        const onClientMismatch = jest.fn().mockReturnValue(false);
        const clientMismatch = {...baseMessageSendingStatus, missing: {'2.wire.test': {[user2.id]: ['client22']}}};
        jest.spyOn(apiClient.api.conversation, 'postOTRMessage').mockImplementation(() => {
          const error = new Error();
          (error as any).response = {
            status: StatusCodes.PRECONDITION_FAILED,
            data: clientMismatch,
          };
          return Promise.reject(error);
        });
        jest
          .spyOn(apiClient.api.user, 'postMultiPreKeyBundles')
          .mockReturnValue(Promise.resolve({qualified_user_client_prekeys: {}}));

        const recipients = generateQualifiedRecipients([user1, user2]);

        await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          onClientMismatch,
          conversationId: {id: 'convid', domain: ''},
        });
        expect(apiClient.api.conversation.postOTRMessage).toHaveBeenCalledTimes(1);
        expect(onClientMismatch).toHaveBeenCalledWith(clientMismatch);
      });
    });
  });
});
