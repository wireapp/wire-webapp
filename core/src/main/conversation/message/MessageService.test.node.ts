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
  MessageSendingStatus,
  OTRRecipients,
  QualifiedOTRRecipients,
  QualifiedUserClients,
} from '@wireapp/api-client/src/conversation';
import {CryptographyService} from '../../cryptography';
import {MessageService} from './MessageService';

const baseMessageSendingStatus: MessageSendingStatus = {
  deleted: {},
  missing: {},
  failed_to_send: {},
  redundant: {},
  time: new Date().toISOString(),
};

type TestUser = {id: string; domain: string; clients: string[]};
const user1: TestUser = {id: UUID.genV4().toString(), domain: '1.wire.test', clients: ['client1.1', 'client1.2']};
const user2: TestUser = {id: UUID.genV4().toString(), domain: '2.wire.test', clients: ['client2.1', 'client2.2']};

function generateQualifiedRecipients(users: TestUser[]): QualifiedUserClients {
  const payload: QualifiedUserClients = {};
  users.forEach(({id, domain, clients}) => {
    payload[domain] ||= {};
    payload[domain][id] = clients;
  });
  return payload;
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

      await messageService.sendFederatedOTRMessage(
        'senderclientid',
        {id: 'convid', domain: ''},
        recipients,
        new Uint8Array(),
      );
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

        await messageService.sendFederatedOTRMessage(
          'senderclientid',
          {id: 'convid', domain: ''},
          recipients,
          new Uint8Array(),
          {reportMissing: true},
        );
        expect(apiClient.conversation.api.postOTRMessageV2).toHaveBeenCalledTimes(2);
      });

      it('continues message sending if onClientMismatch returns true', async () => {
        const onClientMismatch = jasmine.createSpy().and.returnValue(Promise.resolve(true));
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

        await messageService.sendFederatedOTRMessage(
          'senderclientid',
          {id: 'convid', domain: ''},
          recipients,
          new Uint8Array(),
          {reportMissing: true, onClientMismatch},
        );
        expect(apiClient.conversation.api.postOTRMessageV2).toHaveBeenCalledTimes(2);
        expect(onClientMismatch).toHaveBeenCalledWith(clientMismatch);
      });

      it('stops message sending if onClientMismatch returns false', async () => {
        const onClientMismatch = jasmine.createSpy().and.returnValue(Promise.resolve(false));
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

        await messageService.sendFederatedOTRMessage(
          'senderclientid',
          {id: 'convid', domain: ''},
          recipients,
          new Uint8Array(),
          {reportMissing: true, onClientMismatch},
        );
        expect(apiClient.conversation.api.postOTRMessageV2).toHaveBeenCalledTimes(1);
        expect(onClientMismatch).toHaveBeenCalledWith(clientMismatch);
      });
    });
  });
});
