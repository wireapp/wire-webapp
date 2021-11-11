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

import UUID from 'uuidjs';
import {StatusCodes} from 'http-status-codes';
import {APIClient} from '@wireapp/api-client';
import {
  ClientMismatch,
  MessageSendingStatus,
  OTRRecipients,
  QualifiedOTRRecipients,
  QualifiedUserClients,
  UserClients,
} from '@wireapp/api-client/src/conversation';
import {GenericMessage, Text} from '@wireapp/protocol-messaging';
import {CryptographyService} from '../../cryptography';
import {MessageService} from './MessageService';
import {getUUID} from '../../test/PayloadHelper';

const baseMessageSendingStatus: MessageSendingStatus = {
  deleted: {},
  missing: {},
  failed_to_send: {},
  redundant: {},
  time: new Date().toISOString(),
};

type TestUser = {id: string; domain: string; clients: string[]};
const user1: TestUser = {
  id: UUID.genV4().toString(),
  domain: '1.wire.test',
  clients: ['client1.1', 'client1.2', 'client1.3', 'client1.4'],
};
const user2: TestUser = {
  id: UUID.genV4().toString(),
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

function generateRecipients(users: TestUser[]): UserClients {
  return users.reduce((acc, {id, clients}) => {
    acc[id] = clients;
    return acc;
  }, {} as UserClients);
}

function fakeEncrypt(_: unknown, recipients: QualifiedUserClients): Promise<QualifiedOTRRecipients> {
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
  return Promise.resolve(encryptedPayload);
}

describe('MessageService', () => {
  const apiClient = new APIClient();
  const cryptographyService = new CryptographyService(apiClient, {} as any);
  const messageService = new MessageService(apiClient, cryptographyService);

  beforeEach(() => {
    spyOn(cryptographyService, 'encryptQualified').and.callFake(fakeEncrypt);
  });

  describe('sendFederatedMessage', () => {
    it('sends a message', async () => {
      spyOn(apiClient.conversation.api, 'postOTRMessageV2').and.returnValue(Promise.resolve(baseMessageSendingStatus));
      const recipients = generateQualifiedRecipients([user1, user2]);

      await messageService.sendFederatedMessage('senderclientid', recipients, new Uint8Array(), {
        conversationId: {id: 'convid', domain: ''},
      });
      expect(apiClient.conversation.api.postOTRMessageV2).toHaveBeenCalled();
    });

    describe('client mismatch', () => {
      it('handles client mismatch internally if no onClientMismatch is given', async () => {
        let spyCounter = 0;
        const clientMismatch = {
          ...baseMessageSendingStatus,
          deleted: {[user1.domain]: {[user1.id]: [user1.clients[0]]}},
          missing: {'2.wire.test': {[user2.id]: ['client22']}},
        };
        spyOn(apiClient.conversation.api, 'postOTRMessageV2').and.callFake(() => {
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
        spyOn(apiClient.user.api, 'postQualifiedMultiPreKeyBundles').and.returnValue(Promise.resolve({}));

        const recipients = generateQualifiedRecipients([user1, user2]);

        await messageService.sendFederatedMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          conversationId: {id: 'convid', domain: ''},
        });
        expect(apiClient.conversation.api.postOTRMessageV2).toHaveBeenCalledTimes(2);
      });

      it('continues message sending if onClientMismatch returns true', async () => {
        const onClientMismatch = jasmine.createSpy('onClientMismatch').and.returnValue(true);
        const clientMismatch = {...baseMessageSendingStatus, missing: {'2.wire.test': {[user2.id]: ['client22']}}};
        let spyCounter = 0;
        spyOn(apiClient.conversation.api, 'postOTRMessageV2').and.callFake(() => {
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
        spyOn(apiClient.user.api, 'postQualifiedMultiPreKeyBundles').and.returnValue(Promise.resolve({}));

        const recipients = generateQualifiedRecipients([user1, user2]);

        await messageService.sendFederatedMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          onClientMismatch,
          conversationId: {id: 'convid', domain: ''},
        });
        expect(apiClient.conversation.api.postOTRMessageV2).toHaveBeenCalledTimes(2);
        expect(onClientMismatch).toHaveBeenCalledWith(clientMismatch);
      });

      it('stops message sending if onClientMismatch returns false', async () => {
        const onClientMismatch = jasmine.createSpy('onClientMismatch').and.returnValue(false);
        const clientMismatch = {...baseMessageSendingStatus, missing: {'2.wire.test': {[user2.id]: ['client22']}}};
        spyOn(apiClient.conversation.api, 'postOTRMessageV2').and.callFake(() => {
          const error = new Error();
          (error as any).response = {
            status: StatusCodes.PRECONDITION_FAILED,
            data: clientMismatch,
          };
          return Promise.reject(error);
        });
        spyOn(apiClient.user.api, 'postQualifiedMultiPreKeyBundles').and.returnValue(Promise.resolve({}));

        const recipients = generateQualifiedRecipients([user1, user2]);

        await messageService.sendFederatedMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          onClientMismatch,
          conversationId: {id: 'convid', domain: ''},
        });
        expect(apiClient.conversation.api.postOTRMessageV2).toHaveBeenCalledTimes(1);
        expect(onClientMismatch).toHaveBeenCalledWith(clientMismatch);
      });
    });
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
    const conversationId = 'conv1';
    const createMessage = (content: string) => {
      const customTextMessage = GenericMessage.create({
        messageId: getUUID(),
        text: Text.create({content}),
      });

      return GenericMessage.encode(customTextMessage).finish();
    };

    it('should send regular to conversation', async () => {
      const message = 'Lorem ipsum dolor sit amet';
      spyOn(apiClient.conversation.api, 'postOTRMessage').and.returnValue(Promise.resolve({} as ClientMismatch));

      await messageService.sendMessage(clientId, generateRecipients(generateUsers(3, 3)), createMessage(message), {
        conversationId,
      });
      expect(apiClient.conversation.api.postOTRMessage).toHaveBeenCalledWith(
        clientId,
        conversationId,
        jasmine.any(Object),
        true,
      );
    });

    it('should send protobuf message to conversation', async () => {
      const message = 'Lorem ipsum dolor sit amet';
      spyOn(apiClient.conversation.api, 'postOTRProtobufMessage').and.returnValue(
        Promise.resolve({} as ClientMismatch),
      );

      await messageService.sendMessage(clientId, generateRecipients(generateUsers(3, 3)), createMessage(message), {
        conversationId,
        sendAsProtobuf: true,
      });
      expect(apiClient.conversation.api.postOTRProtobufMessage).toHaveBeenCalledWith(
        clientId,
        conversationId,
        jasmine.any(Object),
        true,
      );
    });

    it('should broadcast regular message if no conversationId is given', async () => {
      const message = 'Lorem ipsum dolor sit amet';
      spyOn(apiClient.broadcast.api, 'postBroadcastMessage').and.returnValue(Promise.resolve({} as ClientMismatch));

      await messageService.sendMessage(clientId, generateRecipients(generateUsers(3, 3)), createMessage(message));
      expect(apiClient.broadcast.api.postBroadcastMessage).toHaveBeenCalledWith(clientId, jasmine.any(Object), true);
    });

    it('should broadcast protobuf message if no conversationId is given', async () => {
      const message = 'Lorem ipsum dolor sit amet';
      spyOn(apiClient.broadcast.api, 'postBroadcastProtobufMessage').and.returnValue(
        Promise.resolve({} as ClientMismatch),
      );

      await messageService.sendMessage(clientId, generateRecipients(generateUsers(3, 3)), createMessage(message), {
        sendAsProtobuf: true,
      });

      expect(apiClient.broadcast.api.postBroadcastProtobufMessage).toHaveBeenCalledWith(
        clientId,
        jasmine.any(Object),
        true,
      );
    });

    it('should not send as external if payload small', async () => {
      const message = 'Lorem ipsum dolor sit amet';
      spyOn(apiClient.conversation.api, 'postOTRMessage').and.returnValue(Promise.resolve({} as ClientMismatch));

      await messageService.sendMessage(clientId, generateRecipients(generateUsers(3, 3)), createMessage(message), {
        conversationId,
      });
      expect(apiClient.conversation.api.postOTRMessage).toHaveBeenCalledWith(
        clientId,
        conversationId,
        jasmine.objectContaining({data: undefined}),
        true,
      );
    });

    it('should send as external if payload is big', async () => {
      const longMessage =
        'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Duis autem Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Duis autem';
      spyOn(apiClient.conversation.api, 'postOTRMessage').and.returnValue(Promise.resolve({} as ClientMismatch));

      await messageService.sendMessage(
        clientId,
        generateRecipients(generateUsers(30, 10)),
        createMessage(longMessage),
        {
          conversationId,
        },
      );
      expect(apiClient.conversation.api.postOTRMessage).toHaveBeenCalledWith(
        clientId,
        conversationId,
        jasmine.objectContaining({data: jasmine.any(String)}),
        true,
      );
    });

    describe('client mismatch', () => {
      const baseClientMismatch: ClientMismatch = {
        deleted: {},
        missing: {},
        redundant: {},
        time: new Date().toISOString(),
      };

      it('handles client mismatch internally if no onClientMismatch is given', async () => {
        let spyCounter = 0;
        const clientMismatch = {
          ...baseClientMismatch,
          deleted: {[user1.id]: [user1.clients[0]]},
          missing: {[user2.id]: ['client22']},
        };
        spyOn(apiClient.conversation.api, 'postOTRMessage').and.callFake(() => {
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
        spyOn(apiClient.user.api, 'postMultiPreKeyBundles').and.returnValue(Promise.resolve({}));

        const recipients = generateRecipients([user1, user2]);

        await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          conversationId: 'convid',
        });
        expect(apiClient.conversation.api.postOTRMessage).toHaveBeenCalledTimes(2);
      });

      it('continues message sending if onClientMismatch returns true', async () => {
        const onClientMismatch = jasmine.createSpy().and.returnValue(Promise.resolve(true));
        const clientMismatch = {...baseClientMismatch, missing: {[user2.id]: ['client22']}};
        let spyCounter = 0;
        spyOn(apiClient.conversation.api, 'postOTRMessage').and.callFake(() => {
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
        spyOn(apiClient.user.api, 'postMultiPreKeyBundles').and.returnValue(Promise.resolve({}));

        const recipients = generateRecipients([user1, user2]);

        await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          onClientMismatch,
          conversationId: 'convid',
        });
        expect(apiClient.conversation.api.postOTRMessage).toHaveBeenCalledTimes(2);
        expect(onClientMismatch).toHaveBeenCalledWith(clientMismatch);
      });

      it('stops message sending if onClientMismatch returns false', async () => {
        const onClientMismatch = jasmine.createSpy().and.returnValue(Promise.resolve(false));
        const clientMismatch = {...baseMessageSendingStatus, missing: {[user2.id]: ['client22']}};
        spyOn(apiClient.conversation.api, 'postOTRMessage').and.callFake(() => {
          const error = new Error();
          (error as any).response = {
            status: StatusCodes.PRECONDITION_FAILED,
            data: clientMismatch,
          };
          return Promise.reject(error);
        });
        spyOn(apiClient.user.api, 'postMultiPreKeyBundles').and.returnValue(Promise.resolve({}));

        const recipients = generateRecipients([user1, user2]);

        await messageService.sendMessage('senderclientid', recipients, new Uint8Array(), {
          reportMissing: true,
          onClientMismatch,
          conversationId: 'convid',
        });
        expect(apiClient.conversation.api.postOTRMessage).toHaveBeenCalledTimes(1);
        expect(onClientMismatch).toHaveBeenCalledWith(clientMismatch);
      });
    });
  });
});
