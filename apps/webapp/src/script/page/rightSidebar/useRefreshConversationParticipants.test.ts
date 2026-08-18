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

import {Conversation} from 'Repositories/entity/Conversation';
import {translateForTest} from 'Util/test/translateForTest';

import {useRefreshConversationParticipants} from './useRefreshConversationParticipants';

const createConversation = (id: string) =>
  new Conversation(id, '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);

const createDeferredPromise = () => {
  let resolvePromise!: () => void;
  const promise = new Promise<void>(resolve => {
    resolvePromise = resolve;
  });

  return {promise, resolve: resolvePromise};
};

describe('useRefreshConversationParticipants', () => {
  it('updates the metadata version after participant refresh completes', async () => {
    const conversation = createConversation('conversation');
    const refresh = createDeferredPromise();
    const refreshUnavailableParticipants = jest.fn(() => refresh.promise);

    const {result} = renderHook(() =>
      useRefreshConversationParticipants({conversation, refreshUnavailableParticipants}),
    );

    expect(result.current).toBe(0);
    expect(refreshUnavailableParticipants).toHaveBeenCalledWith(conversation);

    await act(async () => refresh.resolve());

    expect(result.current).toBe(1);
  });

  it('ignores refresh completion from a conversation that is no longer active', async () => {
    const firstConversation = createConversation('first-conversation');
    const secondConversation = createConversation('second-conversation');
    const firstRefresh = createDeferredPromise();
    const secondRefresh = createDeferredPromise();
    const refreshUnavailableParticipants = jest
      .fn()
      .mockReturnValueOnce(firstRefresh.promise)
      .mockReturnValueOnce(secondRefresh.promise);

    const {result, rerender} = renderHook(
      ({conversation}) => useRefreshConversationParticipants({conversation, refreshUnavailableParticipants}),
      {initialProps: {conversation: firstConversation}},
    );

    rerender({conversation: secondConversation});
    await act(async () => firstRefresh.resolve());

    expect(result.current).toBe(0);

    await act(async () => secondRefresh.resolve());

    expect(result.current).toBe(1);
  });
});
