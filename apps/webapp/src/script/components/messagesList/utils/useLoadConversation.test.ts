/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {act, renderHook} from '@testing-library/react';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {Message} from 'Repositories/entity/message/message';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {useLoadConversation} from './useLoadConversation';

describe('useLoadConversation', () => {
  it.each([false, true])(
    'loads the conversation after its members when an initial message exists: %s',
    async hasInitialMessage => {
      const conversation = new Conversation('conversation', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
      const initialMessage = new Message('anchor', undefined, translateForTest);
      conversation.initialMessage(hasInitialMessage ? initialMessage : undefined);
      conversation.last_read_timestamp(0);
      const memberUpdate = Promise.withResolvers<Conversation>();
      const updateParticipatingUserEntities = jest.fn().mockReturnValue(memberUpdate.promise);
      const getMessagesWithOffset = jest.fn().mockResolvedValue([initialMessage]);
      const getPrecedingMessages = jest.fn().mockResolvedValue([]);
      const conversationRepository = {
        updateParticipatingUserEntities,
        getMessagesWithOffset,
        getPrecedingMessages,
      } as unknown as ConversationRepository;
      const conversationLastReadTimestamp = {current: 99};
      const onLoading = jest.fn();
      const {result} = renderHook(
        () => {
          return useLoadConversation({conversation, conversationRepository, conversationLastReadTimestamp, onLoading});
        },
        {
          wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest})),
        },
      );

      const loading = result.current.loadConversation(conversation);

      expect(conversationLastReadTimestamp.current).toBe(0);
      expect(onLoading).toHaveBeenLastCalledWith(true);
      expect(getMessagesWithOffset).not.toHaveBeenCalled();
      expect(getPrecedingMessages).not.toHaveBeenCalled();

      await act(async () => {
        memberUpdate.resolve(conversation);
        const actualMessages = await loading;

        expect(actualMessages).toEqual(hasInitialMessage ? [initialMessage] : []);
      });

      expect(updateParticipatingUserEntities).toHaveBeenCalledWith(conversation, false, true);
      expect(getMessagesWithOffset).toHaveBeenCalledTimes(hasInitialMessage ? 1 : 0);
      expect(getPrecedingMessages).toHaveBeenCalledTimes(hasInitialMessage ? 0 : 1);
      expect(onLoading).toHaveBeenLastCalledWith(false);
    },
  );
});
