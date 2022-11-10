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
import * as GenericMessageParams from './Utility/getGenericMessageParams';

import {ClientClassification, ClientType} from '@wireapp/api-client/lib/client';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';

import {APIClient} from '@wireapp/api-client';
import {MemoryEngine} from '@wireapp/store-engine';

import {ProteusService} from './ProteusService';

import {PayloadBundleState} from '../../../conversation';
import {buildTextMessage} from '../../../conversation/message/MessageBuilder';
import {CryptographyService} from '../../../cryptography';
import {getUUID} from '../../../test/PayloadHelper';

jest.mock('./Utility/getGenericMessageParams', () => {
  return {
    getGenericMessageParams: jest.fn(),
  };
});
const MockedGenericMessageParams = GenericMessageParams as jest.Mocked<typeof GenericMessageParams>;

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
    it(`indicates when sending was canceled`, async () => {
      const proteusService = buildProteusService();
      MockedGenericMessageParams.getGenericMessageParams.mockResolvedValue({
        error: true,
      } as any);
      jest
        .spyOn(proteusService['messageService'], 'sendMessage')
        .mockReturnValue(Promise.resolve({time: '', errored: true} as any));

      const message = buildTextMessage({text: 'test'});
      const payloadBundle = await proteusService.sendProteusMessage({
        payload: message,
        conversationId: {id: 'conv1', domain: ''},
        protocol: ConversationProtocol.PROTEUS,
      });

      expect(payloadBundle.state).toBe(PayloadBundleState.CANCELLED);
    });
  });
});
