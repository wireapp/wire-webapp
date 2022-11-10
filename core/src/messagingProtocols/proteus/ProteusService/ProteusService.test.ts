/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

/* eslint-disable import/order */
import * as Recipients from './Utility/Recipients';

import {ClientClassification, ClientType} from '@wireapp/api-client/lib/client';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';

import {APIClient} from '@wireapp/api-client';
import {MemoryEngine} from '@wireapp/store-engine';

import {ProteusService} from './ProteusService';

import {MessageTargetMode} from '../../../conversation';
import {buildTextMessage} from '../../../conversation/message/MessageBuilder';
import {CryptographyService} from '../../../cryptography';
import {getUUID} from '../../../test/PayloadHelper';
import {SendProteusMessageParams} from './ProteusService.types';

jest.mock('./Utility/Recipients', () => ({
  ...jest.requireActual('./Utility/Recipients'),
  getRecipientsForConversation: jest.fn(),
  getQualifiedRecipientsForConversation: jest.fn(),
}));
const MockedRecipients = Recipients as jest.Mocked<typeof Recipients>;

const buildProteusService = (federated: boolean = false) => {
  const apiClient = new APIClient({urls: APIClient.BACKEND.STAGING});
  jest.spyOn(apiClient.api.user, 'postListClients').mockImplementation(() =>
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

  apiClient.context = {
    clientType: ClientType.NONE,
    userId: getUUID(),
    clientId: getUUID(),
  };

  const cryptographyService = new CryptographyService(apiClient, new MemoryEngine(), {
    useQualifiedIds: false,
    nbPrekeys: 1,
  });
  return new ProteusService(apiClient, cryptographyService, {useQualifiedIds: federated});
};

describe('sendGenericMessage', () => {
  describe('targetted messages', () => {
    const message = buildTextMessage({text: 'test'});
    // eslint-disable-next-line jest/no-done-callback

    it('fails if no userIds are given', async () => {
      const proteusService = buildProteusService();
      let errorMessage;

      const params: SendProteusMessageParams = {
        conversationId: {id: 'conv1', domain: ''},
        payload: message,
        protocol: ConversationProtocol.PROTEUS,
        targetMode: MessageTargetMode.USERS,
      };

      try {
        await proteusService.sendProteusMessage(params);
      } catch (error) {
        errorMessage = error.message;
      } finally {
        expect(errorMessage).toContain('no userIds are given');
      }
    });

    [{user1: ['client1'], user2: ['client11', 'client12']}, ['user1', 'user2']].forEach(recipients => {
      it(`forwards the list of users to report (${JSON.stringify(recipients)})`, async () => {
        const proteusService = buildProteusService();

        MockedRecipients.getRecipientsForConversation.mockResolvedValue({} as any);

        jest.spyOn(proteusService['messageService'], 'sendMessage').mockReturnValue(Promise.resolve({} as any));
        await proteusService.sendProteusMessage({
          protocol: ConversationProtocol.PROTEUS,
          payload: message,
          targetMode: MessageTargetMode.USERS,
          userIds: recipients,
          conversationId: {id: 'conv1', domain: ''},
        });

        expect(proteusService['messageService'].sendMessage).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          expect.any(Uint8Array),
          expect.objectContaining({reportMissing: ['user1', 'user2']}),
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
        const proteusService = buildProteusService(true);
        MockedRecipients.getQualifiedRecipientsForConversation.mockResolvedValue({} as any);
        jest.spyOn(proteusService['messageService'], 'sendFederatedMessage').mockResolvedValue({} as any);
        await proteusService.sendProteusMessage({
          protocol: ConversationProtocol.PROTEUS,
          conversationId: {id: 'conv1', domain: 'domain1'},
          payload: message,
          targetMode: MessageTargetMode.USERS,
          userIds: recipients,
        });

        expect(proteusService['messageService'].sendFederatedMessage).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          expect.any(Uint8Array),
          expect.objectContaining({
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
        const proteusService = buildProteusService(false);
        MockedRecipients.getRecipientsForConversation.mockReturnValue(Promise.resolve({} as any));
        jest.spyOn(proteusService['messageService'], 'sendMessage').mockReturnValue(Promise.resolve({} as any));
        await proteusService.sendProteusMessage({
          conversationId: {id: 'conv1', domain: ''},
          protocol: ConversationProtocol.PROTEUS,
          payload: message,
          targetMode: MessageTargetMode.USERS_CLIENTS,
          userIds: recipients,
        });

        expect(proteusService['messageService'].sendMessage).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          expect.any(Uint8Array),
          expect.objectContaining({reportMissing: false}),
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
        const proteusService = buildProteusService(true);

        MockedRecipients.getQualifiedRecipientsForConversation.mockResolvedValue({} as any);
        jest
          .spyOn(proteusService['messageService'], 'sendFederatedMessage')
          .mockReturnValue(Promise.resolve({} as any));
        await proteusService.sendProteusMessage({
          protocol: ConversationProtocol.PROTEUS,
          conversationId: {id: 'conv1', domain: 'domain1'},
          payload: message,
          targetMode: MessageTargetMode.USERS_CLIENTS,
          userIds: recipients,
        });

        expect(proteusService['messageService'].sendFederatedMessage).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          expect.any(Uint8Array),
          expect.objectContaining({
            reportMissing: false,
          }),
        );
      });
    });
  });
});
