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
import * as GenericMessageParams from '../Utility/getGenericMessageParams';

import {ClientClassification} from '@wireapp/api-client/lib/client';
import {Conversation, NewConversation} from '@wireapp/api-client/lib/conversation';

import {MessageSendingState} from '../../../conversation';
import {buildTextMessage} from '../../../conversation/message/MessageBuilder';
import {buildProteusService} from './ProteusService.mocks';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

jest.mock('../Utility/getGenericMessageParams', () => {
  return {
    getGenericMessageParams: jest.fn(),
  };
});
const MockedGenericMessageParams = GenericMessageParams as jest.Mocked<typeof GenericMessageParams>;

const prepareProteusService = async () => {
  const [proteusService, {apiClient}] = await buildProteusService();

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
  jest
    .spyOn(apiClient.api.conversation, 'postConversation')
    .mockImplementation(data => Promise.resolve(data as Conversation));

  return proteusService;
};

afterAll(() => {
  jest.clearAllTimers();
});

describe('sendGenericMessage', () => {
  describe('targetted messages', () => {
    it(`indicates when sending was canceled`, async () => {
      const proteusService = await prepareProteusService();

      MockedGenericMessageParams.getGenericMessageParams.mockResolvedValue({
        error: true,
      } as any);
      jest
        .spyOn(proteusService['messageService'], 'sendMessage')
        .mockReturnValue(Promise.resolve({time: '', canceled: true} as any));

      const message = buildTextMessage({text: 'test'});
      const payloadBundle = await proteusService.sendMessage({
        payload: message,
        conversationId: {id: 'conv1', domain: ''},
        protocol: CONVERSATION_PROTOCOL.PROTEUS,
      });

      expect(payloadBundle.state).toBe(MessageSendingState.CANCELED);
    });
  });
});

describe('createConversation', () => {
  describe('calls the api with valid conversation data', () => {
    const createConversationResult = {
      name: 'test',
      receipt_mode: null,
      users: ['user1', 'user2'],
    };
    it('when a new conversation object is given', async () => {
      const proteusService = await prepareProteusService();
      const conversationData = createConversationResult as unknown as NewConversation;
      const returnData = await proteusService.createConversation(conversationData);

      expect(returnData.conversation).toStrictEqual(createConversationResult);
    });

    it('create a new conversation with no name', async () => {
      const proteusService = await prepareProteusService();
      const conversationData = {users: ['user1', 'user2'], receipt_mode: null};
      const returnData = await proteusService.createConversation(conversationData);

      expect(returnData.conversation).toStrictEqual(conversationData);
    });
  });
});
