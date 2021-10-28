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
import {MessageSendingStatus, QualifiedOTRRecipients} from '@wireapp/api-client/src/conversation';
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

function generatePayload(users: TestUser[]): QualifiedOTRRecipients {
  const payload: QualifiedOTRRecipients = {};
  users.forEach(({id, domain, clients}) => {
    payload[domain] ||= {};
    payload[domain][id] = {};
    clients.forEach(client => (payload[domain][id][client] = new Uint8Array()));
  });
  return payload;
}

describe('MessageService', () => {
  const apiClient = new APIClient();
  const cryptographyService = new CryptographyService(apiClient, {} as any);
  const messageService = new MessageService(apiClient, cryptographyService);
  describe('sendFederatedMessage', () => {
    it('sends a message', async () => {
      spyOn(apiClient.conversation.api, 'postOTRMessageV2').and.returnValue(Promise.resolve(baseMessageSendingStatus));
      const recipients: QualifiedOTRRecipients = generatePayload([user1, user2]);

      await messageService.sendFederatedOTRMessage('senderclientid', 'convid', '', recipients, new Uint8Array());
      expect(apiClient.conversation.api.postOTRMessageV2).toHaveBeenCalled();
    });

    it('handles mismatch errors internally if reportMissing is true', async () => {
      let spyCounter = 0;
      spyOn(apiClient.conversation.api, 'postOTRMessageV2').and.callFake(() => {
        spyCounter++;
        if (spyCounter === 1) {
          const error = new Error();
          (error as any).response = {
            status: StatusCodes.PRECONDITION_FAILED,
            data: {...baseMessageSendingStatus, missing: {'2.wire.test': {[user2.id]: ['client22']}}},
          };
          return Promise.reject(error);
        }
        return Promise.resolve(baseMessageSendingStatus);
      });
      spyOn(apiClient.user.api, 'postQualifiedMultiPreKeyBundles').and.returnValue(Promise.resolve({}));
      spyOn(cryptographyService, 'encryptQualified').and.returnValue(
        Promise.resolve({'2.wire.test': {[user2.id]: {client22: new Uint8Array()}}}),
      );

      const recipients: QualifiedOTRRecipients = generatePayload([user1, user2]);

      await messageService.sendFederatedOTRMessage(
        'senderclientid',
        'convid',
        '',
        recipients,
        new Uint8Array(),
        undefined,
        true,
      );
      expect(apiClient.conversation.api.postOTRMessageV2).toHaveBeenCalledTimes(2);
    });
  });
});
